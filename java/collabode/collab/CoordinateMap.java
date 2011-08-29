package collabode.collab;

import java.util.*;
import java.util.concurrent.ConcurrentSkipListSet;

import org.eclipse.jface.text.IRegion;
import org.eclipse.jface.text.Region;
import org.eclipse.text.edits.ReplaceEdit;

/**
 * Map between character offsets in local and union documents.
 */
class CoordinateMap {
    
    private static class UL {
        final int union;
        final int local;
        UL(int union, int local) {
            this.union = union;
            this.local = local;
        }
        @Override public String toString() {
            return "(" + union + "," + local + ")";
        }
    }
    
    private static UL ul(int union, int local) {
        return new UL(union, local);
    }
    
    private static UL u(int offset) {
        return new UL(offset, Integer.MAX_VALUE);
    }
    
    private static UL l(int offset) {
        return new UL(Integer.MAX_VALUE, offset);
    }
    
    private final NavigableSet<UL> pairsByUnion = new ConcurrentSkipListSet<UL>(new Comparator<UL>() {
        public int compare(UL ul1, UL ul2) {
            if (ul1.union != ul2.union) {
                return ul1.union - ul2.union;
            } else if (ul1.local != ul2.local) {
                return ul1.local - ul2.local;
            } else {
                return 0;
            }
        }
    });
    private final NavigableSet<UL> pairsByLocal = new ConcurrentSkipListSet<UL>(new Comparator<UL>() {
        public int compare(UL ul1, UL ul2) {
            if (ul1.local != ul2.local) {
                return ul1.local - ul2.local;
            } else if (ul1.union != ul2.union) {
                return ul1.union - ul2.union;
            } else {
                return 0;
            }
        }
    });
    
    private List<IRegion> cachedUnionOnlyRegions = null;
    private List<IRegion> cachedLocalOnlyRegions = null;
    
    CoordinateMap() {
        add(ul(0, 0));
    }
    
    CoordinateMap(CoordinateMap other) {
        pairsByUnion.addAll(other.pairsByUnion);
        pairsByLocal.addAll(other.pairsByLocal);
    }

    private synchronized void add(UL pair) {
        uncache();
        pairsByUnion.add(pair);
        pairsByLocal.add(pair);
    }
    
    private synchronized void addAll(Collection<UL> pairs) {
        for (UL pair : pairs) {
            add(pair);
        }
    }
    
    private synchronized void remove(UL pair) {
        uncache();
        pairsByUnion.remove(pair);
        pairsByLocal.remove(pair);
    }
    
    private void uncache() {
        cachedUnionOnlyRegions = null;
        cachedLocalOnlyRegions = null;
    }
    
    // Minimize pairs, required for correctness.
    private synchronized void reduce() {
        int delta = 0;
        UL prev = pairsByUnion.first();
        for (UL pair : pairsByUnion.tailSet(prev, false).toArray(new UL[0])) {
            int newDelta = (pair.union - pair.local) - (prev.union - prev.local);
            if (newDelta == 0) {
                remove(pair);
            } else if (delta < 0 && newDelta < 0 && pair.union == prev.union) {
                remove(prev);
                prev = pair;
            } else if (delta > 0 && newDelta > 0 && pair.local == prev.local) {
                remove(prev);
                prev = pair;
            } else {
                prev = pair;
            }
            delta = newDelta;
        }
    }
    
    /**
     * Update this map to reflect an edit applied only to the union document.
     */
    public synchronized void unionOnly(ReplaceEdit edit) {
        int localEndOfDelete = unionToLocal(edit.getOffset() + edit.getLength());
        if (edit.getLength() > 0) {
            for (UL pair : pairsByUnion.tailSet(u(edit.getOffset())).toArray(new UL[0])) {
                remove(pair);
                if (pair.union > edit.getOffset() + edit.getLength()) {
                    add(ul(pair.union - edit.getLength(), pair.local));
                } else {
                    add(ul(edit.getOffset(), pair.local));
                }
            }
            add(ul(edit.getOffset(), localEndOfDelete));
        }
        if ( ! edit.getText().isEmpty()) {
            List<UL> add = new ArrayList<UL>();
            for (UL pair : pairsByUnion.tailSet(u(edit.getOffset())).toArray(new UL[0])) {
                remove(pair);
                add.add(ul(pair.union + edit.getText().length(), pair.local));
            }
            addAll(add);
            add(ul(edit.getOffset() + edit.getText().length(), localEndOfDelete));
        }
        reduce();
    }
    
    /**
     * Update this map to reflect an edit applied to both union and local documents.
     */
    public synchronized void unionAndLocal(ReplaceEdit edit) {
        if (edit.getLength() > 0) {
            for (UL pair : pairsByUnion.tailSet(u(edit.getOffset())).toArray(new UL[0])) {
                remove(pair);
                if (pair.union >= edit.getOffset() + edit.getLength()) {
                    add(ul(pair.union - edit.getLength(), pair.local - edit.getLength()));
                } // else XXX
            }
        }
        if ( ! edit.getText().isEmpty()) {
            List<UL> add = new ArrayList<UL>();
            for (UL pair : pairsByUnion.tailSet(u(edit.getOffset())).toArray(new UL[0])) {
                remove(pair);
                add.add(ul(pair.union + edit.getText().length(), pair.local + edit.getText().length()));
            }
            addAll(add);
        }
        reduce();
    }
    
    /**
     * Update this map to reflect an edit previously applied only to the union document,
     * now applied to the local document.
     */
    public synchronized void localCatchup(ReplaceEdit edit) {
        if (edit.getLength() > 0) {
            for (UL pair : pairsByLocal.tailSet(pairsByLocal.ceiling(l(edit.getOffset()))).toArray(new UL[0])) {
                remove(pair);
                add(ul(pair.union, pair.local - edit.getLength()));
            }
        }
        if ( ! edit.getText().isEmpty()) {
            for (UL pair : pairsByLocal.tailSet(pairsByLocal.floor(l(edit.getOffset()))).toArray(new UL[0])) {
                remove(pair);
                add(ul(pair.union, pair.local + edit.getText().length()));
            }
        }
        reduce();
    }
    
    /**
     * Convert a union offset to a local offset.
     */
    public synchronized int unionToLocal(int offset) {
        UL unionFloor = pairsByUnion.floor(u(offset));
        int local = unionFloor.local + (offset - unionFloor.union);
        UL localFloor = pairsByLocal.floor(l(local));
        if (unionFloor == localFloor) {
            return local;
        } else {
            return pairsByUnion.ceiling(u(offset)).local;
        }
    }
    
    /**
     * Convert a local offset to a union offset.
     */
    public synchronized int localToUnion(int offset) {
        UL localFloor = pairsByLocal.floor(l(offset));
        int union = localFloor.union + (offset - localFloor.local);
        UL unionFloor = pairsByUnion.floor(u(union));
        if (localFloor == unionFloor) {
            return union;
        } else {
            return pairsByLocal.ceiling(l(offset)).union;
        }
    }
    
    /**
     * Enumerate regions appearing only in the union document.
     */
    public synchronized List<IRegion> unionOnlyRegions() {
        if (cachedUnionOnlyRegions != null) { return cachedUnionOnlyRegions; }
        
        List<IRegion> cachedUnionOnlyRegions = new ArrayList<IRegion>();
        int diff = 0;
        for (Iterator<UL> it = pairsByUnion.iterator(); it.hasNext(); ) {
            UL pair = it.next();
            int newDiff = pair.union - pair.local;
            if (newDiff > diff) {
                cachedUnionOnlyRegions.add(new Region(pair.union - (newDiff - diff), newDiff - diff));
            }
            diff = newDiff;
        }
        return cachedUnionOnlyRegions;
    }
    
    /**
     * Enumerate regions appearing only in the local document.
     */
    public synchronized List<IRegion> localOnlyRegions() {
        if (cachedLocalOnlyRegions != null) { return cachedLocalOnlyRegions; }
        
        List<IRegion> cachedLocalOnlyRegions = new ArrayList<IRegion>();
        int diff = 0;
        for (Iterator<UL> it = pairsByUnion.iterator(); it.hasNext(); ) {
            UL pair = it.next();
            int newDiff = pair.union - pair.local;
            if (newDiff < diff) {
                cachedLocalOnlyRegions.add(new Region(pair.union, diff - newDiff));
            }
            diff = newDiff;
        }
        return cachedLocalOnlyRegions;
    }
    
    IRegion unionOnlyRegionContaining(IRegion sub) {
        for (IRegion region : unionOnlyRegions()) {
            if (region.getOffset() + region.getLength() >= sub.getOffset() + sub.getLength()
                    && region.getOffset() <= sub.getOffset()) {
                return region;
            }
        }
        return null; // XXX
    }
    
    List<IRegion> unionOnlyRegionsContainedBy(IRegion sup) {
        List<IRegion> subs = new ArrayList<IRegion>(4);
        for (IRegion region : unionOnlyRegions()) {
            if (region.getOffset() + region.getLength() > sup.getOffset() + sup.getLength()) {
                break;
            } else if (region.getOffset() >= sup.getOffset()) {
                subs.add(region);
            }
        }
        return subs;
    }
    
    List<IRegion> localOnlyRegionsContainedBy(IRegion sup) {
        List<IRegion> subs = new ArrayList<IRegion>(4);
        for (IRegion region : localOnlyRegions()) {
            if (region.getOffset() >= sup.getOffset()
                    && region.getOffset() + region.getLength() <= sup.getOffset() + sup.getLength()) {
                subs.add(region);
            }
        }
        return subs;
    }
    
    @Override public synchronized String toString() {
        StringBuffer buff = new StringBuffer();
        Iterator<UL> unions = pairsByUnion.iterator();
        Iterator<UL> locals = pairsByLocal.iterator();
        int diff = 0;
        while (unions.hasNext()) {
            if ( ! locals.hasNext()) {
                System.err.println(pairsByUnion + " != " + pairsByLocal);
                throw new Error("no local for union " + unions.next());
            }
            UL pair = unions.next();
            UL localPair = locals.next();
            if (pair != localPair) {
                System.err.println(pairsByUnion + " != " + pairsByLocal);
                throw new Error("union " + pair + " != local " + localPair);
            }
            
            int newDiff = pair.union - pair.local;
            if (newDiff < diff) {
                buff.append("[" + (diff - newDiff) + "local]");
            } else if (newDiff > diff) {
                buff.append("[" + (newDiff - diff) + "union]");
            }
            diff = newDiff;
            
            buff.append(pair);
        }
        if (locals.hasNext()) {
            System.err.println(pairsByUnion + " != " + pairsByLocal);
            throw new Error("no union for local " + locals.next());
        }
        return buff.toString();
    }
}
