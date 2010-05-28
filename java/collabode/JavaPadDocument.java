package collabode;

import java.io.IOException;
import java.util.*;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IResource;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jdt.core.*;
import org.eclipse.jdt.core.compiler.IProblem;
import org.eclipse.jdt.ui.text.IJavaPartitions;
import org.eclipse.jface.text.*;
import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.StyleRange;

import scala.Function1;

/**
 * A Java document synchronized with an EtherPad pad.
 */
public class JavaPadDocument extends PadDocument implements IBuffer {
    
    private final ICompilationUnit workingCopy;
    
    private boolean closed = false;
    private final Set<IBufferChangedListener> listeners = new HashSet<IBufferChangedListener>();
    
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
        
        Workspace.getJavaTextTools().setupJavaDocumentPartitioner(this, IJavaPartitions.JAVA_PARTITIONING);
        
        super.addDocumentListener(new IDocumentListener() {
            public void documentAboutToBeChanged(DocumentEvent event) { }
            public void documentChanged(final DocumentEvent event) {
                notifyListeners(event.fOffset, event.fLength, event.fText);
                reconcileWorkingCopy(false);
                syntaxColor(event.fOffset, event.fLength);
            }
        });
        
        syntaxColor(0, getLength());
    }
    
    private void notifyListeners(int offset, int length, String text) {
        for (IBufferChangedListener listener : listeners) {
            listener.bufferChanged(new BufferChangedEvent(this, offset, length, text));
        }
    }
    
    private void reconcileWorkingCopy(boolean forceProblems) {
        try {
            workingCopy.reconcile(ICompilationUnit.NO_AST, forceProblems, owner, null);
        } catch (JavaModelException jme) {
            jme.printStackTrace(); // XXX
        }
    }
    
    private void syntaxColor(int offset, int length) {
        if (offset >= getLength()) { return; }
        length = Math.min(length, getLength() - offset); // XXX needed to handle deletions?
        
        TextPresentation pres = owner.presenter.createRepairDescription(new Region(offset, length), this);
        
        final Iterator<?> it = pres.getAllStyleRangeIterator();
        
        // XXX assumes that we're starting at the beginning of the document
        // XXX need to update with an initial keep operation
        // XXX also assumes consecutive regions, is that always true?
        
        PadFunctions.syncStyle.apply(owner.username, file, getLength(), new Iterator<ChangeSetOp>() {
            private ChangeSetOp rest = null;
            public boolean hasNext() {
                return rest != null || it.hasNext();
            }
            public ChangeSetOp next() {
                if (rest != null) {
                    ChangeSetOp ret = rest;
                    rest = null;
                    return ret;
                }
                
                StyleRange sr = (StyleRange)it.next();
                try {
                    String[][] attributes = new String[][] {
                            {"bold", sr.fontStyle == SWT.BOLD ? "true" : ""},
                            {"italic", sr.fontStyle == SWT.ITALIC ? "true" : ""}
                    };
                    String text = get(sr.start, sr.length);
                    int lastNewline = text.lastIndexOf('\n');
                    if (lastNewline < 0) {
                        return new ChangeSetOp('=', 0, sr.length, attributes);
                    } else {
                        rest = new ChangeSetOp('=', 0, sr.length - lastNewline - 1, attributes);
                        return new ChangeSetOp('=', getNumberOfLines(sr.start, lastNewline), lastNewline + 1, attributes);
                    }
                } catch (BadLocationException ble) {
                    throw new NoSuchElementException(ble.getMessage()); // XXX
                }
            }
            public void remove() {
                throw new UnsupportedOperationException();
            }
        });
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
        try {
            workingCopy.codeComplete(offset, new PadCompletionRequestor() {
                public void report(List<CompletionProposal> relevant) {
                    reporter.apply(relevant.toArray());
                }
            });
        } catch (JavaModelException jme) {
            jme.printStackTrace(); // XXX
        }
    }
}

/**
 * Code completion proposal receiver. Accepts completion proposals, determines
 * relevant ones, and reports them.
 * XXX Need better proposal ranking.
 */
abstract class PadCompletionRequestor extends CompletionRequestor {
    private static final Comparator<CompletionProposal> COMPARE = new Comparator<CompletionProposal>() {
        public int compare(CompletionProposal cp1, CompletionProposal cp2) {
            int delta = cp2.getRelevance() - cp1.getRelevance();
            if (delta != 0) {
                return delta;
            }
            delta = cp2.getKind() - cp1.getKind();
            if (delta != 0) {
                return delta;
            }
            return new String(cp1.getCompletion()).compareTo(new String(cp2.getCompletion()));
        }
    };
    
    final SortedSet<CompletionProposal> proposals = new TreeSet<CompletionProposal>(COMPARE);
    
    public void accept(CompletionProposal proposal) {
        proposals.add(proposal);
    }
    
    @Override public void endReporting() {
        List<CompletionProposal> relevant = new ArrayList<CompletionProposal>();
        int ii = 0;
        for (Iterator<CompletionProposal> it = proposals.iterator(); ii < 20 && it.hasNext(); ii++) {
            relevant.add(it.next());
        }
        report(relevant);
    }
    
    /**
     * Called with proposals to display. XXX
     */
    public abstract void report(List<CompletionProposal> relevant);
}
