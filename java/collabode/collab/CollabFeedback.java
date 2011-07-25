package collabode.collab;

import static collabode.ChangeSetOpIterator.CLEAR;
import static collabode.ChangeSetOpIterator.AS_IS;

import java.util.ArrayList;
import java.util.List;

import org.eclipse.jface.text.*;
import org.eclipse.swt.custom.StyleRange;
import org.eclipse.swt.graphics.Color;
import org.eclipse.swt.graphics.RGB;

import collabode.*;

/**
 * Generates collaboration UI feedback.
 */
public class CollabFeedback implements CollabListener {
    
    private static final Color MINE = new Color(null, new RGB(255, 255, 200));
    private static final Color OTHER = new Color(null, new RGB(230, 230, 230));
    
    public CollabFeedback(Collab collab) {
    }
    
    public void updated(PadDocument updated) {
        List<ChangeSetOpIterator> styles = new ArrayList<ChangeSetOpIterator>();
        for (PadDocument doc : updated.collab) {
            try {
                styles.add(update(doc, new TextPresentation()));
            } catch (BadLocationException ble) {
                ble.printStackTrace(); // XXX
            }
        }
        Workspace.scheduleTask("pdsyncPadStyles", "collabup", updated.collab, styles.toArray());
    }
    
    public void committed(CollabDocument doc) {
        List<ChangeSetOpIterator> styles = new ArrayList<ChangeSetOpIterator>();
        for (PadDocument padDoc : doc) {
            TextPresentation base = new TextPresentation();
            base.mergeStyleRange(new StyleRange(0, doc.union.getLength(), null, CLEAR, AS_IS));
            try {
                styles.add(update(padDoc, base));
            } catch (BadLocationException ble) {
                ble.printStackTrace(); // XXX
            }
        }
        Workspace.scheduleTask("pdsyncPadStyles", "collabco", doc, styles.toArray());
    }
    
    private ChangeSetOpIterator update(PadDocument doc, TextPresentation base) throws BadLocationException {
        final CollabDocument collab = doc.collab;
        List<Annotation> annotations = new ArrayList<Annotation>();
        
        List<IRegion> notInLocal = collab.unionOnlyRegions(doc);
        for (IRegion r : notInLocal) {
            base.mergeStyleRange(new StyleRange(r.getOffset(), r.getLength(), null, OTHER, AS_IS));
            annotations.add(new Annotation(collab.union.getLineOfOffset(r.getOffset()), "other-add", "Incoming change has not yet been committed"));
        }
        for (IRegion r : collab.unionOnlyRegionsOfDisk()) {
            if ( ! notInLocal.contains(r)) {
                base.mergeStyleRange(new StyleRange(r.getOffset(), r.getLength(), null, MINE, AS_IS));
                annotations.add(new Annotation(collab.union.getLineOfOffset(r.getOffset()), "local-add", "Your change has not yet been committed"));
            }
        }
        
        List<IRegion> onlyInLocal = collab.localOnlyRegions(doc);
        for (IRegion r : onlyInLocal) {
            annotations.add(new Annotation(collab.union.getLineOfOffset(r.getOffset()), "other-del", "Incoming deletion has not yet been committed"));
        }
        for (IRegion r : collab.localOnlyRegionsOfDisk()) {
            if ( ! onlyInLocal.contains(r)) {
                annotations.add(new Annotation(collab.union.getLineOfOffset(r.getOffset()), "local-del", "Your deletion has not yet been committed"));
            }
        }
        
        Workspace.scheduleTask("updateAnnotations", doc.owner.username, collab.file, "collab", annotations.toArray());
        return collab.unionPresentationToUnionChangeSet(doc, base);
    }
}
