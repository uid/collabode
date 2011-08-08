package collabode;

import java.io.*;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.content.IContentType;
import org.eclipse.jface.text.BadLocationException;
import org.eclipse.jface.text.Document;
import org.eclipse.text.edits.ReplaceEdit;

import collabode.collab.CollabDocument;

/**
 * A document synchronized with an EtherPad pad.
 */
public class PadDocument extends Document {
    
    public final PadDocumentOwner owner;
    public final CollabDocument collab;
    
    PadDocument(PadDocumentOwner owner, CollabDocument collab) throws IOException {
        super();
        this.owner = owner;
        this.collab = collab;
    }
    
    /**
     * Returns an informal name for this document's preferred content type.
     */
    public String getContentTypeName() {
        try {
            InputStream contents = new ByteArrayInputStream(get().getBytes());
            IContentType type = collab.file.getProject().getContentTypeMatcher().findContentTypeFor(contents, collab.file.getName());
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
     * Returns true iff the edits are allowed.
     * This implementation always permits edits. XXX should it?
     */
    public synchronized boolean isAllowed(ReplaceEdit[] edits, String[] permissions) {
        return true;
    }
    
    @Override public String toString() {
        return getClass().getSimpleName() + "<" + owner.username + "," + collab.collaboration.id + "," + collab.file + ">";
    }
}
