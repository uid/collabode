package collabode;

import java.util.*;

import org.eclipse.jface.text.*;
import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.StyleRange;
import org.eclipse.swt.graphics.Color;
import org.eclipse.swt.graphics.RGB;
import org.eclipse.text.edits.*;

public class ChangeSetOpIterator implements Iterator<ChangeSetOp> {
    
    /**
     * Default foreground color. Clears existing style.
     */
    public static final Color OPAQUE = new Color(null, new RGB(0, 0, 0));
    /**
     * Default background color. Clears existing style.
     */
    public static final Color CLEAR = new Color(null, new RGB(255, 255, 255));
    /**
     * No font style. Similar to <code>null</code> color. Does not clear existing style.
     */
    public static final int AS_IS = -1;
    
    public final int revision;
    public final int length;
    
    private Queue<ChangeSetOp> rest = new LinkedList<ChangeSetOp>();
    
    /**
     * Create a changeset for presentation changes.
     */
    ChangeSetOpIterator(int revision, IDocument doc, TextPresentation presentation, String namespace) {
        this.revision = revision;
        length = doc.getLength();
        
        int last = 0;
        for (Iterator<?> it = presentation.getAllStyleRangeIterator(); it.hasNext(); ) {
            StyleRange sr = (StyleRange)it.next();
            if (sr.start > last) {
                queue(doc, last, sr.start - last); // no style information
            }
            queue(doc, sr, namespace);
            last = sr.start + sr.length;
        }
    }
    
    /**
     * Create a changeset for text edits.
     * <code>doc</code> must <b>not</b> yet have <code>edit</code> applied.
     */
    ChangeSetOpIterator(int revision, final IDocument doc, TextEdit edit) {
        this.revision = revision;
        length = doc.getLength();
        
        edit.accept(new TextEditVisitor() {
            int last = 0;
            
            @Override public boolean visit(ReplaceEdit edit) {
                queue(doc, last, edit, edit.getText());
                last = edit.getOffset() + edit.getLength();
                return true;
            }
            
            @Override public boolean visit(MultiTextEdit edit) {
                return true;
            }
            
            @Override public boolean visit(InsertEdit edit) {
                queue(doc, last, edit, edit.getText());
                last = edit.getOffset() + edit.getLength();
                return true;
            }
            
            @Override public boolean visit(DeleteEdit edit) {
                queue(doc, last, edit, "");
                last = edit.getOffset() + edit.getLength();
                return true;
            }
            
            @Override public boolean visitNode(TextEdit edit) {
                throw new IllegalArgumentException("No visit for " + edit);
            }
        });
    }
    
    public boolean hasNext() {
        return ! rest.isEmpty();
    }
    
    public ChangeSetOp next() {
        return rest.remove();
    }
    
    public void remove() {
        throw new UnsupportedOperationException();
    }
    
    private void queue(IDocument doc, StyleRange sr, String namespace) {
        List<String[]> attribs = new ArrayList<String[]>();
        
        if (sr.fontStyle != AS_IS) {
            attribs.add(new String[] { "bold", (sr.fontStyle & SWT.BOLD) != 0 ? "true" : ""});
            attribs.add(new String[] { "italic", (sr.fontStyle & SWT.ITALIC) != 0 ? "true" : "" });
        }
        
        if (OPAQUE.equals(sr.foreground)) {
            attribs.add(new String[] { "foreground", "" });
        } else if (sr.foreground != null) {
            attribs.add(new String[] {
                    "foreground",
                    sr.foreground.getRed() + "," + sr.foreground.getGreen() + "," + sr.foreground.getBlue()
            });
        }
        
        if (CLEAR.equals(sr.background)) {
            attribs.add(new String[] { "background", "" });
        } else if (sr.background != null) {
            attribs.add(new String[] {
                    "background",
                    sr.background.getRed() + "," + sr.background.getGreen() + "," + sr.background.getBlue()
            });
        }
        
        if (namespace != null && ! namespace.isEmpty()) {
            for (String[] attrib : attribs) {
                attrib[0] = namespace + "$" + attrib[0];
            }
        }
        
        queue(doc, sr.start, sr.length, attribs.toArray(new String[0][]));
    }
    
    private void queue(IDocument doc, int start, int length, String[]... attribs) {
        try {
            // XXX faster to use regex for last newline plus doc.getNumberOfLines?
            rest.add(new ChangeSetOp("=", doc.get(start, length), attribs));
        } catch (BadLocationException ble) {
            throw new NoSuchElementException(ble.getMessage()); // XXX
        }
    }
    
    private void queue(IDocument doc, int last, TextEdit edit, String editText) {
        try {
            rest.add(new ChangeSetOp("=", doc.get(last, edit.getOffset()-last)));
            
            if (edit.getLength() > 0) {
                rest.add(new ChangeSetOp("-", doc.get(edit.getOffset(), edit.getLength())));
            }
            
            if ( ! editText.isEmpty()) {
                rest.add(new ChangeSetOp("+", editText));
            }
        } catch (BadLocationException ble) {
            throw new NoSuchElementException(ble.getMessage()); // XXX
        }
    }
    
    @Override public String toString() {
        return getClass().getSimpleName() + rest;
    }
}
