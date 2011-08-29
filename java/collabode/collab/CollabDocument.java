package collabode.collab;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;

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
    
    public final Collab collaboration;
    public final IFile file;
    
    private int revision;
    public final IDocument union;
    public final DiskDocument disk;
    private final CoordinateMap diskMap;
    private final ConcurrentMap<PadDocument, CoordinateMap> localMaps = new ConcurrentHashMap<PadDocument, CoordinateMap>();
    
    public final Queue<ChangeSetOpIterator> styleQueue = new ConcurrentLinkedQueue<ChangeSetOpIterator>();
    
    CollabDocument(Collab collab, IFile file, Function1<String, Double> setPadText) throws IOException, CoreException {
        this.collaboration = collab;
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
        revision = newRevision;
        if (edits.length > 1) { // XXX revision is a lie until all edits have been applied
            System.err.println("Incorrect doc revision " + revision + " for " + (edits.length-1) + " intermediate");
        }
        
        SortedSet<Integer> breaks = null;
        List<ReplaceEdit> broken = new ArrayList<ReplaceEdit>();
        for (ReplaceEdit edit : edits) {
            if (edit.getLength() <= 1) {
                broken.add(edit);
                continue;
            }
            if (breaks == null) {
                breaks = new TreeSet<Integer>();
                for (Map.Entry<? extends IDocument, CoordinateMap> entry : localAndDiskMaps()) {
                    for (IRegion region : entry.getValue().unionOnlyRegions()) {
                        breaks.add(region.getOffset());
                        breaks.add(region.getOffset() + region.getLength());
                    }
                    for (IRegion region : entry.getValue().localOnlyRegions()) {
                        breaks.add(region.getOffset());
                    }
                }
            }
            int offset = edit.getOffset();
            for (int br : breaks) {
                if (br <= offset) { continue; }
                if (br >= offset + edit.getLength()) { break; }
                int length = br - offset;
                offset = br;
                broken.add(new ReplaceEdit(edit.getOffset(), length, edit.getText()));
                edit = new ReplaceEdit(edit.getOffset() + edit.getText().length(), edit.getLength() - length, "");
            }
            broken.add(edit);
        }
        
        for (ReplaceEdit edit : broken) {
            boolean editingUncommitted = diskMap.unionOnlyRegionContaining(edit.getRegion()) != null;
            
            diskMap.unionOnly(edit);
            union.replace(edit.getOffset(), edit.getLength(), edit.getText());
            
            for (Map.Entry<PadDocument, CoordinateMap> entry : localMaps.entrySet()) {
                if (editingUncommitted) {
                    if (entry.getValue().unionOnlyRegionContaining(edit.getRegion()) != null) {
                        entry.getValue().unionOnly(edit);
                    } else {
                        entry.getKey().replace(entry.getValue().unionToLocal(edit.getOffset()), edit.getLength(), edit.getText());
                        entry.getValue().unionAndLocal(edit);
                    }
                } else {
                    if (entry.getKey().equals(doc)) {
                        entry.getKey().replace(entry.getValue().unionToLocal(edit.getOffset()), edit.getLength(), edit.getText());
                        entry.getValue().unionAndLocal(edit);
                    } else {
                        entry.getValue().unionOnly(edit);
                    }
                }
            }
        }
        
        collaboration.syncedUnionCoordinateEdits(doc, Arrays.asList(edits));
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
        
        collaboration.committedDiskCoordinateEdits(this, edits);
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
            List<IRegion> parts = entry.getValue().localOnlyRegionsContainedBy(localOnly);
            if (parts.isEmpty()) { continue; }
            for (IRegion part : parts) {
                int localOffset = entry.getValue().unionToLocal(part.getOffset()) - part.getLength();
                entry.getValue().localCatchup(new ReplaceEdit(localOffset, part.getLength(), ""));
                entry.getKey().replace(localOffset, part.getLength(), "");
            }
        }
    }
    
    private void commitUnionInsert(IRegion unionOnly, String text) throws BadLocationException {
        for (Map.Entry<? extends IDocument, CoordinateMap> entry : localAndDiskMaps()) {
            List<IRegion> parts = entry.getValue().unionOnlyRegionsContainedBy(unionOnly);
            if (parts.isEmpty()) { continue; }
            for (IRegion part : parts) {
                int localOffset = entry.getValue().unionToLocal(part.getOffset());
                String localText = union.get(part.getOffset(), part.getLength()); // XXX not using text argument
                entry.getValue().localCatchup(new ReplaceEdit(localOffset, 0, localText));
                entry.getKey().replace(localOffset, 0, localText);
            }
        }
    }
    
    public void syncStyles(ChangeSetOpIterator style) {
        styleQueue.add(style);
        Workspace.scheduleTask("pdsyncQueuedStyles", this);
    }
    
    public void syncStyles(Collection<ChangeSetOpIterator> styles) {
        styleQueue.addAll(styles);
        Workspace.scheduleTask("pdsyncQueuedStyles", this);
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
            int start = map.localToUnion(sr.start);
            int end = map.localToUnion(sr.start + sr.length);
            sr.start = start;
            sr.length = end - start;
        }
        return new ChangeSetOpIterator(revision, union, presentation, doc.owner.username);
    }
    
    /**
     * Convert union presentation to a union changeset.
     */
    ChangeSetOpIterator unionPresentationToUnionChangeSet(PadDocument doc, TextPresentation presentation) {
        return new ChangeSetOpIterator(revision, union, presentation, doc.owner.username);
    }
    
    @Override public String toString() {
        return getClass().getSimpleName() + "<" + collaboration.id + "," + file + "," + revision + "," + localMaps.keySet() + ">";
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
