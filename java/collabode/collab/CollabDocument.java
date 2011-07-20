package collabode.collab;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.jdt.core.JavaModelException;
import org.eclipse.jface.text.*;
import org.eclipse.swt.custom.StyleRange;
import org.eclipse.text.edits.*;
import org.mortbay.util.IO;

import scala.Function1;
import collabode.*;

/**
 * A filed edited in a {@link Collab collaboration}.
 * Maintains a collection of {@link PadDocument} working copies and the version on disk.
 */
public class CollabDocument implements Iterable<PadDocument> {
    
    private final Collab collab;
    public final IFile file;
    
    private int revision;
    public final IDocument union;
    public final DiskDocument disk;
    private final CoordinateMap diskMap;
    private final ConcurrentMap<PadDocument, CoordinateMap> localMaps = new ConcurrentHashMap<PadDocument, CoordinateMap>();
    
    CollabDocument(Collab collab, IFile file, Function1<String, Double> setPadText) throws IOException, CoreException {
        this.collab = collab;
        this.file = file;
        
        disk = new DiskDocument(file);
        diskMap = new CoordinateMap();
        
        revision = setPadText.apply(disk.get()).intValue();
        
        union = new Document(disk.get());
    }
    
    public Iterator<PadDocument> iterator() {
        return localMaps.keySet().iterator();
    }
    
    synchronized void createPadDocument(String userId) throws IOException, JavaModelException {
        PadDocument doc = PadDocumentOwner.of(userId).create(file); // XXX relies on create not to duplicate
        if ( ! localMaps.containsKey(doc)) {
            localMaps.put(doc, new CoordinateMap(diskMap));
            doc.set(disk.get());
        }
    }
    
    /**
     * Synchronize edits from pad to documents.
     */
    public synchronized void syncUnionCoordinateEdits(PadDocument doc, int newRevision, ReplaceEdit[] edits) throws BadLocationException {
        List<ReplaceEdit> localEdits = new ArrayList<ReplaceEdit>(edits.length);
        for (ReplaceEdit edit : edits) {
            diskMap.unionOnly(edit);
            for (Map.Entry<PadDocument, CoordinateMap> entry : localMaps.entrySet()) {
                if (entry.getKey().equals(doc)) {
                    localEdits.add(new ReplaceEdit(entry.getValue().unionToLocal(edit.getOffset()), edit.getLength(), edit.getText()));
                    entry.getValue().unionAndLocal(edit);
                } else {
                    entry.getValue().unionOnly(edit);
                }
            }
        }
        
        revision = newRevision;
        if (edits.length > 1) { // XXX revision is a lie until all edits have been applied
            System.err.println("Incorrect doc revision " + revision + " for " + (edits.length-1) + " intermediate");
        }
        
        for (ReplaceEdit edit : edits) {
            union.replace(edit.getOffset(), edit.getLength(), edit.getText());
        }
        for (ReplaceEdit edit : localEdits) {
            doc.replace(edit.getOffset(), edit.getLength(), edit.getText());
        }
        
        collab.syncedUnionCoordinateEdits(doc, Arrays.asList(edits));
    }
    
    /**
     * Commit edits to disk.
     * XXX Edits must be in reverse offset order.
     */
    public synchronized void commitDiskCoordinateEdits(Collection<ReplaceEdit> edits) throws BadLocationException {
        for (ReplaceEdit edit : edits) {
            if (edit.getLength() > 0) {
                for (IRegion region : diskMap.localOnlyRegions()) {
                    if (diskMap.unionToLocal(region.getOffset()) - edit.getLength() == edit.getOffset()
                            && region.getLength() == edit.getLength()) {
                        commitUnionDelete(region);
                    }
                }
            }
            if (edit.getText().length() > 0) {
                for (IRegion region : diskMap.unionOnlyRegions()) {
                    if (diskMap.unionToLocal(region.getOffset()) == edit.getOffset()
                            && region.getLength() == edit.getText().length()) {
                        commitUnionInsert(region, edit.getText());
                    }
                }
            }
        }
        
        disk.commit();
        
        collab.committedDiskCoordinateEdits(this, edits);
    }
    
    private Iterable<Map.Entry<? extends IDocument, CoordinateMap>> localAndDiskMaps() {
        List<Map.Entry<? extends IDocument, CoordinateMap>> entries = new ArrayList<Map.Entry<? extends IDocument, CoordinateMap>>();
        entries.addAll(localMaps.entrySet());
        entries.add(new Map.Entry<IDocument, CoordinateMap>() {
            public IDocument getKey() { return disk; }
            public CoordinateMap getValue() { return diskMap; }
            public CoordinateMap setValue(CoordinateMap value) { throw new UnsupportedOperationException(); }
        });
        return entries;
    }
    
    private void commitUnionDelete(IRegion localOnly) throws BadLocationException {
        for (Map.Entry<? extends IDocument, CoordinateMap> entry : localAndDiskMaps()) {
            if (entry.getValue().localOnlyRegions().contains(localOnly)) {
                int localOffset = entry.getValue().unionToLocal(localOnly.getOffset()) - localOnly.getLength();
                entry.getValue().localCatchup(new ReplaceEdit(localOffset, localOnly.getLength(), ""));
                entry.getKey().replace(localOffset, localOnly.getLength(), "");
            }
        }
    }
    
    private void commitUnionInsert(IRegion unionOnly, String text) throws BadLocationException {
        for (Map.Entry<? extends IDocument, CoordinateMap> entry : localAndDiskMaps()) {
            if (entry.getValue().unionOnlyRegions().contains(unionOnly)) {
                int localOffset = entry.getValue().unionToLocal(unionOnly.getOffset());
                entry.getValue().localCatchup(new ReplaceEdit(localOffset, 0, text));
                entry.getKey().replace(localOffset, 0, text);
            }
        }
    }
    
    List<IRegion> unionOnlyRegionsOfDisk() {
        return diskMap.unionOnlyRegions();
    }
    
    List<IRegion> localOnlyRegionsOfDisk() {
        return diskMap.localOnlyRegions();
    }
    
    List<IRegion> unionOnlyRegions(PadDocument doc) {
        return localMaps.get(doc).unionOnlyRegions();
    }
    
    List<IRegion> localOnlyRegions(PadDocument doc) {
        return localMaps.get(doc).localOnlyRegions();
    }
    
    int unionToLocalOffsetOfDisk(int offset) {
        return diskMap.unionToLocal(offset);
    }
    
    /**
     * Convert a union offset to a local offset.
     */
    public int unionToLocalOffset(PadDocument doc, int offset) {
        return localMaps.get(doc).unionToLocal(offset);
    }
    
    /**
     * Convert a local offset to a union offset.
     */
    public int localToUnionOffset(PadDocument doc, int offset) {
        return localMaps.get(doc).localToUnion(offset);
    }
    
    /**
     * Convert local annotations to union annotations.
     */
    public List<Annotation> localAnnotationsToUnionAnnotations(PadDocument doc, List<Annotation> annotations) throws BadLocationException {
        List<Annotation> unionized = new LinkedList<Annotation>();
        for (Annotation local : annotations) {
            int line = union.getLineOfOffset(localMaps.get(doc).localToUnion(doc.getLineOffset(local.lineNumber)));
            unionized.add(new Annotation(line, local.subtype, local.message));
        }
        return unionized;
    }
    
    /**
     * Convert local edits to a union changeset.
     */
    public ChangeSetOpIterator localTextEditToUnionChangeset(PadDocument doc, TextEdit edit) {
        TextEditModifier mod = new TextEditModifier(localMaps.get(doc));
        edit.accept(mod);
        return new ChangeSetOpIterator(revision, union, mod.result());
    }
    
    /**
     * Convert local presentation to a union changeset.
     * XXX Mutates presentation's StyleRanges!
     */
    public ChangeSetOpIterator localPresentationToUnionChangeset(PadDocument doc, TextPresentation presentation) {
        final CoordinateMap map = localMaps.get(doc);
        for (Iterator<?> it = presentation.getAllStyleRangeIterator(); it.hasNext(); ) {
            StyleRange sr = (StyleRange)it.next();
            sr.start = map.localToUnion(sr.start);
        }
        return new ChangeSetOpIterator(revision, union, presentation, doc.owner.username);
    }
    
    /**
     * Convert union presentation to a union changeset.
     */
    ChangeSetOpIterator unionPresentationToUnionChangeSet(PadDocument doc, TextPresentation presentation) {
        return new ChangeSetOpIterator(revision, union, presentation, doc.owner.username);
    }
}

/**
 * Represents the document on disk.
 */
class DiskDocument extends Document {
    
    final IFile file;
    
    DiskDocument(IFile file) throws IOException, CoreException {
        this.file = file;
        set(IO.toString(file.getContents()).replaceAll("\t", "    ")); // XXX clobbers tabs
    }
    
    /**
     * Commit the contents of this document to the filesystem.
     */
    public void commit() {
        try {
            file.setContents(new ByteArrayInputStream(get().getBytes()), false, true, null);
        } catch (CoreException ce) {
            ce.printStackTrace(); // XXX
        }
    }
}

/**
 * Visitor that rebuilds text edits, mapping local offsets to union offsets.
 */
class TextEditModifier extends TextEditVisitor {
    
    private final CoordinateMap map;
    private TextEdit result;
    
    TextEditModifier(CoordinateMap map) {
        this.map = map;
    }
    
    /**
     * The new edit.
     */
    TextEdit result() {
        return result;
    }
    
    @Override public boolean visit(ReplaceEdit edit) {
        rebuild(edit, new ReplaceEdit(map.localToUnion(edit.getOffset()), edit.getLength(), edit.getText()));
        return false;
    }
    
    @Override public boolean visit(MultiTextEdit edit) {
        rebuild(edit, new MultiTextEdit());
        return false;
    }
    
    @Override public boolean visit(InsertEdit edit) {
        rebuild(edit, new InsertEdit(map.localToUnion(edit.getOffset()), edit.getText()));
        return false;
    }
    
    @Override public boolean visit(DeleteEdit edit) {
        rebuild(edit, new DeleteEdit(map.localToUnion(edit.getOffset()), edit.getLength()));
        return false;
    }
    
    @Override public boolean visitNode(TextEdit edit) {
        throw new IllegalArgumentException("No visit for " + edit);
    }
    
    private void rebuild(TextEdit edit, TextEdit replacement) {
        TextEdit[] children = edit.removeChildren();
        for (int ii = 0; ii < children.length; ii++) {
            children[ii].accept(this);
            children[ii] = result;
        }
        replacement.addChildren(children);
        result = replacement;
    }
}
