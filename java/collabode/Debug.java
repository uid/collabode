package collabode;

import java.util.*;
import java.util.concurrent.*;

import net.appjet.oui.GenericLogger;

/**
 * Debugging support.
 */
public class Debug {
    
    private static final GenericLogger log = new GenericLogger("backend", "debug", true);
    static { log.start(); }
    
    private static final DelayQueue<Entry> queue = new DelayQueue<Entry>();
    static {
        Thread thread = new Thread(new Runnable() {
            public void run() {
                while (true) {
                    try { queue.take().write(); } catch (InterruptedException ie) { }
                }
            }
        }, "Debug message queue");
        thread.setPriority(Thread.MIN_PRIORITY);
        thread.start();
    }
    
    /**
     * Announce the current method on {@link System#out}.
     */
    public static void here(Object... args) {
        StackTraceElement[] stack = Thread.currentThread().getStackTrace();
        System.out.println(clean(stack[2]) + (stack.length > 3 ? " <-- " + clean(stack[3]): ""));
        if (args.length == 0) return;
        System.out.print("    " + args[0]);
        for (int ii = 1; ii < args.length; ii++) {
            System.out.print(", " + args[ii]);
        }
        System.out.println();
    }
    
    private static String clean(StackTraceElement point) {
        return point.toString().replaceAll(Debug.class.getPackage().getName() + "(\\.[a-z]+)*\\.", "");
    }
    
    /**
     * Start a debug log entry with the current method name.
     */
    public static Entry begin() {
        return new Entry(Thread.currentThread().getStackTrace()[2].getMethodName());
    }
    
    /**
     * Start a debug log entry.
     */
    public static Entry begin(String event) {
        return new Entry(event);
    }
    
    /**
     * Debug log entry.
     */
    public static class Entry implements Delayed {
        private final long start = System.currentTimeMillis();
        private final String event;
        private final Map<String, Object> map = new HashMap<String, Object>();
        private long expire = start + 60000;
        
        private Entry(String event) {
            this.event = event;
            queue.add(this);
        }
        
        /**
         * Add a key-value pair to this debug log entry.
         */
        public Entry add(String key, Object value) {
            map.put(key, value);
            return this;
        }
        
        /**
         * Add a timestamp to this debug log entry.
         */
        public Entry time(String event) {
            map.put(event, System.currentTimeMillis());
            return this;
        }
        
        public void end() {
            queue.remove(this);
            map.put("ended", System.currentTimeMillis());
            expire = 0;
            queue.add(this);
        }
        
        /**
         * Write this entry to the debug log.
         */
        void write() {
            queue.remove(this);
            map.put("started", start);
            map.put("written", System.currentTimeMillis());
            map.put("event", event);
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                if (entry.getValue() instanceof Object[]) {
                    entry.setValue(Arrays.toString((Object[])entry.getValue()));
                }
            }
            log.log(new scala.collection.mutable.JavaMapAdaptor<String, Object>(map));
        }
        
        public int compareTo(Delayed o) {
            Entry other = (Entry)o;
            if (expire < other.expire) { return -1; }
            if (other.expire < expire) { return 1; }
            return event.compareTo(other.event);
        }
        
        public long getDelay(TimeUnit unit) {
            return unit.convert(expire - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
        }
    }
}
