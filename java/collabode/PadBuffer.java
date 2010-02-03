package collabode;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.*;
import java.util.concurrent.CopyOnWriteArraySet;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IFolder;
import org.eclipse.core.resources.IResource;
import org.eclipse.core.resources.IWorkspaceRunnable;
import org.eclipse.core.runtime.*;
import org.eclipse.jdt.core.*;
import org.eclipse.jdt.core.compiler.IProblem;

import scala.Function1;

/**
 * Implements a buffer synchronized with an EtherPad pad.
 * 
 * @see JDT implemention in org.eclipse.jdt.internal.core.Buffer
 * 
 * TODO Should be refactored to implement efficient append and replace operations.
 * TODO Should be refactored so that pad updates apply a changeset instead of replacing the entire text.
 */
public abstract class PadBuffer implements IBuffer {
    
    final PadWorkingCopyOwner owner;
    final IFile file; // may be null
    final ProblemRequestor problems = new ProblemRequestor();
    
    private final Set<IBufferChangedListener> listeners = new CopyOnWriteArraySet<IBufferChangedListener>();
    private char[] characters; // initially null
    private boolean unsavedChanges = false;
    private boolean closed = false;
    private final Object lock = new Object();
    
    PadBuffer(PadWorkingCopyOwner owner, IFile file) {
        this.owner = owner;
        this.file = file;
    }

    public void addBufferChangedListener(IBufferChangedListener listener) {
        System.out.println("PadBuffer.addBufferChangedListener(" + listener + ")");
        listeners.add(listener);
    }

    public void append(char[] text) {
        char[] appended = new char[characters.length + text.length];
        System.arraycopy(characters, 0, appended, 0, characters.length);
        System.arraycopy(text, 0, appended, characters.length, text.length);
        setContents(text);
    }

    public void append(String text) {
        append(text.toCharArray());
    }

    public void close() {
        synchronized (lock) {
            if (closed) { return; }
            this.characters = null;
            this.closed = true;
        }
        notifyListeners(new BufferChangedEvent(this, 0, 0, null));
    }

    public char getChar(int position) {
        synchronized (lock) {
            if (characters == null) { return Character.MIN_VALUE; }
            return characters[position];
        }
    }

    public char[] getCharacters() {
        synchronized (lock) {
            if (characters == null) { return null; }
            char[] copy = new char[characters.length];
            System.arraycopy(characters, 0, copy, 0, characters.length);
            return copy;
        }
    }

    public String getContents() {
        synchronized (lock) {
            if (characters == null) { return null; }
            return new String(characters);
        }
    }

    public int getLength() {
        synchronized (lock) {
            if (characters == null) { return -1; }
            return characters.length;
        }
    }

    public String getText(int offset, int length) {
        char[] characters = getCharacters();
        return new String(characters, offset, length);
    }

    public IResource getUnderlyingResource() {
        return file;
    }

    public boolean hasUnsavedChanges() {
        return unsavedChanges;
    }

    public boolean isClosed() {
        return closed;
    }

    public boolean isReadOnly() {
        return (file == null || file.isReadOnly());
    }

    public void removeBufferChangedListener(IBufferChangedListener listener) {
        listeners.remove(listener);
    }

    public void replace(int position, int length, char[] text) {
        char[] replaced = new char[characters.length - length + text.length];
        System.arraycopy(characters, 0, replaced, 0, position);
        System.arraycopy(text, 0, replaced, position, text.length);
        System.arraycopy(characters, position + length, replaced, position + text.length, characters.length - position - length);
        setContents(replaced);
    }

    public void replace(int position, int length, String text) {
        replace(position, length, text.toCharArray());
    }

    public void save(IProgressMonitor progress, final boolean force) throws JavaModelException {
        if (isReadOnly()) { return; }
        if ( ! unsavedChanges) { return; }

        String contents = getContents();
        if (contents == null) { return; }

        try {
            final InputStream stream = new ByteArrayInputStream(contents.getBytes());
            if (file.exists()) {
                file.setContents(stream, force, true, null);
            } else {
                file.getWorkspace().run(new IWorkspaceRunnable() {
                    public void run(IProgressMonitor monitor) throws CoreException {
                        IPath path = file.getProjectRelativePath();
                        for (int ii = 1; ii < path.segmentCount(); ii++) {
                            IFolder folder = file.getProject().getFolder(path.uptoSegment(ii));
                            if (!folder.exists()) {
                                folder.create(force, true, null);
                            }
                        }
                        file.create(stream, force, null);
                    }
                }, null);
            }
        } catch (CoreException ce) {
            throw new JavaModelException(ce);
        }

        unsavedChanges = false;
    }

    public void setContents(char[] contents) {
        //System.out.println("PadBuffer.setContents");
        if (isClosed() || isReadOnly()) { return; }

        if (characters == null) {
            synchronized (lock) {
                PadFunctions.create.apply(owner.username, file, new String(contents));
                characters = contents;
                unsavedChanges = true;
            }            
            return;
        }
        PadFunctions.setContents.apply(owner.username, file, new String(contents));
        characters = contents;
        unsavedChanges = true;
        notifyListeners(new BufferChangedEvent(this, 0, getLength(), getContents()));
    }

    public void setContents(String contents) {
        setContents(contents.toCharArray());
    }

    /**
     * Set contents because pad contents changed. Does not call back to pad. Does reconcile.
     * @param contents new contents
     */
    public void reviseContents(String contents) {
        //System.out.println("PadBuffer.reviseContents(...)");
        if (isClosed() || isReadOnly()) { return; }

        if (contents.equals(getContents())) { return; }

        characters = contents.toCharArray();
        unsavedChanges = true;
        notifyListeners(new BufferChangedEvent(this, 0, getLength(), getContents()));

        reconcileWorkingCopy(false);
    }

    public abstract void reconcileWorkingCopy(boolean forceProblems);

    public abstract void codeComplete(int offset, final Function1<Object[],Boolean> reporter);

    private void notifyListeners(final BufferChangedEvent event) {
        for (final IBufferChangedListener listener : listeners) {
            SafeRunner.run(new ISafeRunnable() {
                public void handleException(Throwable exception) {
                    exception.printStackTrace(); // XXX
                }

                public void run() throws Exception {
                    //System.out.println("PadBuffer.notifyListeners notifying listener");
                    listener.bufferChanged(event);
                }
            });
        }
    }
    
    class ProblemRequestor implements IProblemRequestor {
        private final List<IProblem> problems = new LinkedList<IProblem>();

        public void beginReporting() {
            problems.clear();
        }

        public void acceptProblem(IProblem problem) {
            problems.add(problem);
        }

        public void endReporting() {
            if (problems.isEmpty()) { return; }
            PadFunctions.reportProblems.apply(owner.username, file, problems.toArray());
        }

        public boolean isActive() {
            return true;
        }
    }
}

class GenericPadBuffer extends PadBuffer {

    GenericPadBuffer(PadWorkingCopyOwner owner, IFile file) {
        super(owner, file);
    }
    
    public IOpenable getOwner() {
        return null; // XXX don't have one
    }
    
    public void reconcileWorkingCopy(boolean forceProblems) {
        // XXX nothing to do
    }
    
    public void codeComplete(int offset, Function1<Object[], Boolean> reporter) {
        // XXX not implemented
    }
}

class JavaPadBuffer extends PadBuffer {
    
    private static final Comparator<CompletionProposal> PROPOSAL_COMPARE = new Comparator<CompletionProposal>() {
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
    
    private final ICompilationUnit workingCopy;
    
    JavaPadBuffer(PadWorkingCopyOwner owner, ICompilationUnit workingCopy) {
        super(owner, workingCopy.getResource() instanceof IFile ? (IFile)workingCopy.getResource() : null);
        this.workingCopy = workingCopy;
    }
    
    public IOpenable getOwner() {
        return workingCopy;
    }
    
    public void reconcileWorkingCopy(boolean forceProblems) {
        //System.out.println("PadBuffer.reconcileWorkingCopy(" + forceProblems + ")");
        try {
            workingCopy.reconcile(ICompilationUnit.NO_AST, forceProblems, owner, null);
        } catch (JavaModelException jme) {
            jme.printStackTrace(); // XXX
        }
    }
    
    public void codeComplete(int offset, final Function1<Object[],Boolean> reporter) {
        try {
            workingCopy.codeComplete(offset, new CompletionRequestor() {
                SortedSet<CompletionProposal> proposals = new TreeSet<CompletionProposal>(PROPOSAL_COMPARE);
                public void accept(CompletionProposal proposal) {
                    proposals.add(proposal);
                }
                @Override public void endReporting() {
                    List<CompletionProposal> relevant = new ArrayList<CompletionProposal>();
                    int ii = 0;
                    for (Iterator<CompletionProposal> it = proposals.iterator(); ii < 20 && it.hasNext(); ii++) {
                        relevant.add(it.next());
                    }
                    //for (CompletionProposal proposal : relevant) {
                    //    System.out.println(proposal.getRelevance() + " " + new String(proposal.getCompletion()));
                    //}
                    reporter.apply(relevant.toArray());
                }
            });
        } catch (JavaModelException jme) {
            jme.printStackTrace(); // XXX
        }
    }
}
