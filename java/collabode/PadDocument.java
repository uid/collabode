package collabode;

import java.io.ByteArrayInputStream;
import java.io.IOException;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IProject;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.content.IContentType;
import org.eclipse.jface.text.*;
import org.eclipse.text.edits.ReplaceEdit;
import org.mortbay.util.IO;

/**
 * A document synchronized with an EtherPad pad.
 */
public class PadDocument extends Document {
    
    final PadDocumentOwner owner;
    final IFile file;
    
    /**
     * Are we currently revising this document to match its EtherPad pad?
     */
    final ThreadLocal<Boolean> revising = new ThreadLocal<Boolean>() {
        @Override protected Boolean initialValue() { return false; }
    };
    
    PadDocument(PadDocumentOwner owner, IFile file) throws IOException {
        super();
        try {
            super.set(IO.toString(file.getContents()));
        } catch (CoreException ce) {
            throw new IOException(ce);
        }
        this.owner = owner;
        this.file = file;
        
        super.addPrenotifiedDocumentListener(new IDocumentListener() {
            public void documentAboutToBeChanged(DocumentEvent event) { }
            public void documentChanged(DocumentEvent event) {
                if ( ! revising.get()) {
                    System.err.println("PadFunctions.whatever(); NEED TO REVISE PAD"); // XXX
                }
                commit(false);
            }
        });
        
        PadFunctions.syncText.apply(owner.username, file, get());
    }
    
    public IProject getProject() {
        return file.getProject();
    }
    
    /**
     * Returns an informal name for this document's preferred content type.
     */
    public String getContentTypeName() {
        try {
            IContentType type = file.getProject().getContentTypeMatcher().findContentTypeFor(new ByteArrayInputStream(get().getBytes()), file.getName());
            if (type != null) {
                return type.getId().replaceFirst(".*\\.", "");
            }
        } catch (IOException ioe) {
            ioe.printStackTrace(); // XXX
        } catch (CoreException ce) {
            ce.printStackTrace(); // XXX
        }
        return "unknown";
    }
    
    /*
     * Synchronize methods that access the document's rep, to make the
     * implementation a bit more threadsafe. Maybe. XXX
     */
    
    @Override public synchronized char getChar(int pos) throws BadLocationException {
        return super.getChar(pos);
    }
    
    @Override public synchronized int getLength() {
        return super.getLength();
    }
    
    @Override public synchronized String get() {
        return super.get();
    }
    
    @Override public synchronized String get(int pos, int length) throws BadLocationException {
        return super.get(pos, length);
    }
    
    @Override public synchronized void replace(int pos, int length, String text, long modificationStamp) throws BadLocationException {
        super.replace(pos, length, text, modificationStamp);
    }
    
    @Override public synchronized void set(String text, long modificationStamp) {
        super.set(text, modificationStamp);
    }
    
    /**
     * Commit the contents of this document to the filesystem.
     * This implementation always commits.
     * @param force if false, the commit may be ignored if the document should not be committed
     */
    public void commit(boolean force) {
        try {
            file.setContents(new ByteArrayInputStream(get().getBytes()), false, true, null);
        } catch (CoreException ce) {
            ce.printStackTrace(); // XXX
        }
    }
    
    /**
     * Updates the content of the document, because the pad content changed.
     * XXX change to a TextEdit and use apply()?
     */
    public synchronized void pdsyncApply(ReplaceEdit[] edits) {
        try {
            revising.set(true);
            for (ReplaceEdit edit : edits) {
                replace(edit.getOffset(), edit.getLength(), edit.getText());
            }
        } catch (BadLocationException ble) {
            ble.printStackTrace(); // XXX badly out of sync
        } finally {
            revising.set(false);
        }
    }
    
    /**
     * Returns true iff the edits are allowed.
     * This implementation always permits edits. XXX should it?
     */
    public synchronized boolean isAllowed(ReplaceEdit[] edits, String[] permissions) {
        return true;
    }
}
