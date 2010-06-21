package collabode;

import java.io.IOException;
import java.util.*;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IResource;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jdt.core.*;
import org.eclipse.jdt.core.compiler.IProblem;
import org.eclipse.jdt.core.dom.AST;
import org.eclipse.jdt.core.dom.CompilationUnit;
import org.eclipse.jdt.core.formatter.CodeFormatter;
import org.eclipse.jdt.ui.text.java.*;
import org.eclipse.jface.text.*;
import org.eclipse.text.edits.*;
import org.eclipse.ui.PlatformUI;

import scala.Function1;
import collabode.complete.JavaPadCompletionProposal;

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
            PadFunctions.reportProblems.apply(owner.username, file, problems.toArray());
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
        Workspace.scheduleTask("pdsyncPadStyle", owner.username, file, new ChangeSetOpIterator(this, presentation));
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
            CompletionProposalCollector collector = new CompletionProposalCollector(workingCopy);
            collector.setInvocationContext(new JavaContentAssistInvocationContext(workingCopy));
            try {
                workingCopy.codeComplete(offset, collector);
            } catch (JavaModelException jme) {
                jme.printStackTrace(); // XXX
                return;
            }
            
            IJavaCompletionProposal[] proposals = collector.getJavaCompletionProposals();
            
            SortedSet<IJavaCompletionProposal> sortedProposals = new TreeSet<IJavaCompletionProposal>(COMPARE);
            for (IJavaCompletionProposal proposal : proposals){
                sortedProposals.add(proposal);
            }
            List<JavaPadCompletionProposal> padProposals = new ArrayList<JavaPadCompletionProposal>(proposals.length);
            for (IJavaCompletionProposal proposal : sortedProposals) {
                padProposals.add(new JavaPadCompletionProposal(proposal));
            }
            
            reporter.apply(padProposals.toArray());
        }
    }
    
    private static final Comparator<IJavaCompletionProposal> COMPARE = new Comparator<IJavaCompletionProposal>() {
        private final CompletionProposalComparator compare = new CompletionProposalComparator();
        public int compare(IJavaCompletionProposal p1, IJavaCompletionProposal p2) {
            return compare.compare(p1, p2);
        }
    };
    
    /**
     * Formats the document's code.
     */
    public ChangeSetOpIterator formatDocument() throws MalformedTreeException, BadLocationException {
        CodeFormatter formatter = ToolFactory.createCodeFormatter(null);
        TextEdit edit = formatter.format(CodeFormatter.K_COMPILATION_UNIT, this.get(), 0, this.getLength(), 0, null);
        return new ChangeSetOpIterator(this, edit);
    }
}
