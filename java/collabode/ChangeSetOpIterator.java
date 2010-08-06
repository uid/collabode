package collabode;

import java.util.*;

import org.eclipse.jface.text.BadLocationException;
import org.eclipse.jface.text.IDocument;
import org.eclipse.jface.text.TextPresentation;
import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.StyleRange;
import org.eclipse.text.edits.*;

public class ChangeSetOpIterator implements Iterator<ChangeSetOp> {
    private Queue<ChangeSetOp> rest = new LinkedList<ChangeSetOp>();
    
    ChangeSetOpIterator(IDocument doc, TextPresentation presentation) {
        StyleRange first = presentation.getFirstStyleRange();
        if (first != null) {
            // initial keep, neither adds nor removes attributes
            queue(doc, 0, first.start);
        }
        for (Iterator<?> it = presentation.getAllStyleRangeIterator(); it.hasNext(); ) {
            queue(doc, (StyleRange)it.next());
        }
    }
    
    ChangeSetOpIterator(final IDocument doc, TextEdit edit) {
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
                last = edit.getOffset();
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
    
    private void queue(IDocument doc, StyleRange sr) {
        List<String[]> attribs = new ArrayList<String[]>();
        attribs.add(new String[] { "bold", sr.fontStyle == SWT.BOLD ? "true" : ""});
        attribs.add(new String[] { "italic", sr.fontStyle == SWT.ITALIC ? "true" : "" });
        if (sr.foreground != null) {
            attribs.add(new String[] {
                    "foreground",
                    sr.foreground.getRed() + "," + sr.foreground.getGreen() + "," + sr.foreground.getBlue()
            });
        };
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
}
