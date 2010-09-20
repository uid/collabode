package collabode;

import java.io.IOException;
import java.util.*;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IResource;
import org.eclipse.core.runtime.*;
import org.eclipse.jdt.core.*;
import org.eclipse.jdt.core.compiler.IProblem;
import org.eclipse.jdt.core.dom.AST;
import org.eclipse.jdt.core.dom.CompilationUnit;
import org.eclipse.jdt.core.formatter.CodeFormatter;
import org.eclipse.jdt.ui.text.java.JavaContentAssistInvocationContext;
import org.eclipse.jface.text.*;
import org.eclipse.text.edits.*;
import org.eclipse.ui.PlatformUI;

import scala.Function1;
import collabode.complete.JavaPadCompletionProposalCollector;
import collabode.orgimport.PadImportOrganizer;

/**
 * A Java document synchronized with an EtherPad pad.
 */
public class JavaPadDocument extends PadDocument implements IBuffer {
    
    private final ICompilationUnit workingCopy;
    
    private boolean closed = false;
    private final Set<IBufferChangedListener> listeners = new HashSet<IBufferChangedListener>();
    
    private final Set<JavaPadReconcileListener> reconciles = new HashSet<JavaPadReconcileListener>();
    
    /**
     * {@link IProblemRequestor} for this document. Returned by
     * {@link PadDocumentOwner#getProblemRequestor(ICompilationUnit)}.
     */
    final IProblemRequestor problems = new IProblemRequestor() {
        private final List<IProblem> problems = new LinkedList<IProblem>();

        public void beginReporting() {
            problems.clear();
        }

        public void acceptProblem(IProblem problem) {
            problems.add(problem);
        }

        public void endReporting() {
            // XXX can we avoid reporting if the list is unchanged?
            Workspace.scheduleTask("reportProblems", owner.username, file, problems.toArray());
            for (IProblem problem : problems) {
                if (problem.isError()) { return; }
            }
            commit(true);
        }

        public boolean isActive() {
            return true;
        }
    };
    
    JavaPadDocument(PadDocumentOwner owner, IFile file, ICompilationUnit workingCopy) throws IOException {
        super(owner, file);
        this.workingCopy = workingCopy;
        
        super.addPrenotifiedDocumentListener(new IDocumentListener() {
            public void documentAboutToBeChanged(DocumentEvent event) { }
            public void documentChanged(final DocumentEvent event) {
                notifyListeners(event.fOffset, event.fLength, event.fText);
                reconcileWorkingCopy(false);
            }
        });
    }
    
    private void notifyListeners(int offset, int length, String text) {
        for (IBufferChangedListener listener : listeners) {
            listener.bufferChanged(new BufferChangedEvent(this, offset, length, text));
        }
    }
    
    public void addReconcileListener(JavaPadReconcileListener listener) {
        reconciles.add(listener);
        reconcileWorkingCopy(true);
    }
    
    private void reconcileWorkingCopy(boolean forceProblems) {
        try {
            CompilationUnit ast = workingCopy.reconcile(AST.JLS3, forceProblems, owner, null);
            notifyListeners(ast);
        } catch (JavaModelException jme) {
            jme.printStackTrace(); // XXX
        }
    }
    
    private void notifyListeners(CompilationUnit ast) {
        for (JavaPadReconcileListener listener : reconciles) {
            listener.reconciled(this, ast);
        }
    }
    
    /**
     * Update syntax highlighting.
     */
    public void changeTextPresentation(TextPresentation presentation) {
        Workspace.scheduleTask("pdsyncPadStyle", owner.username, file, revision, new ChangeSetOpIterator(this, presentation));
    }
    
    /*
     * Implement IBuffer interface.
     */
    
    @Override public void addBufferChangedListener(final IBufferChangedListener listener) {
        listeners.add(listener);
    }

    @Override public void append(char[] text) {
        this.append(new String(text));
    }

    @Override public void append(String text) {
        this.replace(getLength(), 0, text);
    }

    @Override public void close() {
        if (closed) { return; }
        closed = true;
        notifyListeners(0, 0, null);
    }

    @Override public char getChar(int position) {
        try {
            return super.getChar(position);
        } catch (BadLocationException ble) {
            ble.printStackTrace();
            throw new Error(ble); // XXX
        }
    }

    @Override public char[] getCharacters() {
        return super.get().toCharArray();
    }

    @Override public String getContents() {
        return super.get();
    }
    
    @Override public int getLength() {
        return super.getLength();
    }

    @Override public IOpenable getOwner() {
        return workingCopy;
    }

    @Override public String getText(int offset, int length) {
        try {
            return super.get(offset, length);
        } catch (BadLocationException ble) {
            ble.printStackTrace();
            throw new Error(ble); // XXX
        }
    }

    @Override public IResource getUnderlyingResource() {
        return file;
    }

    @Override public boolean hasUnsavedChanges() {
        Debug.here();
        System.err.println("UNIMPLEMENTED"); // XXX
        return false;
    }

    @Override public boolean isClosed() {
        return closed;
    }

    @Override public boolean isReadOnly() {
        return (file == null || file.isReadOnly());
    }

    @Override public void removeBufferChangedListener(IBufferChangedListener listener) {
        listeners.remove(listener);
    }

    @Override public void replace(int position, int length, char[] text) {
        this.replace(position, length, new String(text));
    }

    @Override public void replace(int position, int length, String text) {
        try {
            super.replace(position, length, text);
        } catch (BadLocationException ble) {
            ble.printStackTrace();
            throw new Error(ble); // XXX
        }
    }

    @Override public void save(IProgressMonitor progress, boolean force) throws JavaModelException {
        Debug.here();
        System.err.println("UNIMPLEMENTED"); // XXX
    }

    @Override public void setContents(char[] contents) {
        this.setContents(new String(contents));
    }

    @Override public void setContents(String contents) {
        super.set(contents);
    }
    
    /*
     * End of IBuffer
     */
    
    /**
     * Commit the contents of this document to the filesystem.
     * This implementation only commits when forced.
     */
    @Override public void commit(boolean force) {
        if ( ! force) { return; }
        
        try {
            workingCopy.commitWorkingCopy(false, null);
        } catch (JavaModelException jme) {
            jme.printStackTrace(); // XXX
        }
    }
    
    /**
     * Returns true iff the edits are allowed.
     * <tt>type:Name</tt> only permits edits within the body of a type <i>Name</i>.
     * <tt>method:name</tt> only permits edits within the body of a method <i>name</i>(...).
     */
    @Override public synchronized boolean isAllowed(ReplaceEdit[] edits, String[] permissions) {
        try {
            for (String permission: permissions) {
                String[] spec = permission.split(":");
                if (spec[0].equals("type")) {
                    if ( ! isEditingElement(edits, IJavaElement.TYPE, spec[1])) {
                        return false;
                    }
                } else if (spec[0].equals("method")) {
                    if ( ! isEditingElement(edits, IJavaElement.METHOD, spec[1])) {
                        return false;
                    }
                } else {
                    return false; // unknown permission
                }
            }
        } catch (JavaModelException jme) {
            jme.printStackTrace(); // XXX
            return false;
        }
        return super.isAllowed(edits, permissions);
    }
    
    /**
     * Returns true iff all the edits are within the <i>body</i> of an element
     * of the given type with the given name.
     */
    private boolean isEditingElement(ReplaceEdit[] edits, int type, String name) throws JavaModelException {
        for (ReplaceEdit edit : edits) {
            IJavaElement elt = workingCopy.getElementAt(edit.getOffset());
            while (elt != null && (elt.getElementType() != type || ! elt.getElementName().equals(name))) {
                elt = elt.getParent();
            }
            if (elt == null) { return false; } // outside required element
            
            ISourceReference ref = (ISourceReference)elt;
            ISourceRange range = ref.getSourceRange();
            int start = range.getOffset() + ref.getSource().indexOf('{');
            int end = range.getOffset() + ref.getSource().lastIndexOf('}');
            if (edit.getOffset() <= start || edit.getOffset() + edit.getLength() > end) {
                return false; // inside element, but outside body
            }
        }
        return true;
    }
    
    /**
     * Obtain code completion proposals at the given offset.
     * Returns only the most relevant proposals to the reporter. XXX
     * @param offset the offset position
     * @param reporter called with an array of {@link CompletionProposal}s
     */
    public void codeComplete(int offset, final Function1<Object[],Boolean> reporter) {
        ProposalRetriever getter = new ProposalRetriever(offset, reporter);
        PlatformUI.getWorkbench().getDisplay().asyncExec(getter);
    }
    
    /**
     * Code completion proposal receiver. Accepts completion proposals, determines
     * relevant ones, and reports them.
     */
    private class ProposalRetriever implements Runnable {
        public int offset;
        public Function1<Object[],Boolean> reporter;
        
        ProposalRetriever(int offset, Function1<Object[],Boolean> reporter) {
            this.offset = offset;
            this.reporter = reporter;
        }
        
        public void run() {
            JavaPadCompletionProposalCollector collector = new JavaPadCompletionProposalCollector(workingCopy);
            collector.setInvocationContext(new JavaContentAssistInvocationContext(workingCopy));
            try {
                workingCopy.codeComplete(offset, collector);
            } catch (JavaModelException jme) {
                jme.printStackTrace(); // XXX
                return;
            }
            
            reporter.apply(collector.getSortedJavaPadCompletionProposals());
        }
    }
    
    /**
     * Formats the document's code.
     */
    public ChangeSetOpIterator formatDocument() throws MalformedTreeException, BadLocationException {
        CodeFormatter formatter = ToolFactory.createCodeFormatter(null);
        TextEdit edit = formatter.format(CodeFormatter.K_COMPILATION_UNIT, this.get(), 0, this.getLength(), 0, null);
        return new ChangeSetOpIterator(this, edit);
    }
    
    /**
     * Performs organize imports.
     */
    public void organizeImports(final String connectionId) {
        new Thread(new Runnable() {
            public void run() {
                try {
                    TextEdit edit = PadImportOrganizer.of(connectionId).createTextEdit(workingCopy);
                    Workspace.scheduleTask("orgImportsApply", owner.username, file, connectionId, new ChangeSetOpIterator(JavaPadDocument.this, edit));
                } catch (OperationCanceledException oce) {
                    // XXX nothing to do
                } catch (CoreException ce) {
                    ce.printStackTrace(); // XXX
                }
            }
        }).start();
    }
    
    /**
     * Provide resolution of ambiguous names.
     * Should only be called during {@link #organizeImports}.
     */
    public void organizeImportsResolved(String connectionId, int[] userChoices) {
        PadImportOrganizer.of(connectionId).chose(userChoices);
    }
    
    public ChangeSetOpIterator knockout(String methodName, String[] paramSigs, String replacement) throws JavaModelException {
        IMethod method = workingCopy.findPrimaryType().getMethod(methodName, paramSigs);
        ISourceRange range = method.getSourceRange();
        String source = method.getSource();
        int start = range.getOffset() + source.indexOf('\n', source.indexOf('{')) + 1;
        int end = range.getOffset() + source.lastIndexOf('\n', source.lastIndexOf('}'));
        return new ChangeSetOpIterator(this, new ReplaceEdit(start, end - start, replacement));
    }
}
