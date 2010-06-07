package collabode;

import java.util.*;

import org.eclipse.jface.text.BadLocationException;
import org.eclipse.jface.text.IDocument;
import org.eclipse.jface.text.TextPresentation;
import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.StyleRange;

public class ChangeSetOpIterator implements Iterator<ChangeSetOp> {
    private Queue<ChangeSetOp> rest = new LinkedList<ChangeSetOp>();
    
    ChangeSetOpIterator(IDocument doc, TextPresentation presentation) {
        StyleRange first = presentation.getFirstStyleRange();
        if (first != null) {
            // initial keep, neither adds nor removes attributes
            queue(doc, 0, first.start, new ArrayList<String[]>());
        }
        for (Iterator<?> it = presentation.getAllStyleRangeIterator(); it.hasNext(); ) {
            queue(doc, (StyleRange)it.next());
        }
    }
    
    public boolean hasNext() {
        return ! rest.isEmpty();
    }
    
    public ChangeSetOp next() {
        //System.out.println(this + " " + rest.peek());
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
        queue(doc, sr.start, sr.length, attribs);
    }
    
    private void queue(IDocument doc, int start, int length, List<String[]> attribs) {
        if (length == 0) { return; }
        try {
            String text = doc.get(start, length);
            int lastNewline = text.lastIndexOf('\n');
            if (lastNewline < 0) {
                rest.add(new ChangeSetOp('=', 0, length, attribs));
                return;
            }
            rest.add(new ChangeSetOp('=', doc.getNumberOfLines(start, lastNewline), lastNewline + 1, attribs));
            if (lastNewline < length - 1) {
                rest.add(new ChangeSetOp('=', 0, length - lastNewline - 1, attribs));
            }
        } catch (BadLocationException ble) {
            throw new NoSuchElementException(ble.getMessage()); // XXX
        }
    }
}
