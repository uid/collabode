package collabode;

/**
 * Debugging support.
 */
public class Debug {
    
    /**
     * Announce the current method on {@link System#out}.
     */
    public static void here() {
        StackTraceElement[] stack = Thread.currentThread().getStackTrace();
        System.out.println(clean(stack[2]) + (stack.length > 3 ? " <-- " + clean(stack[3]): ""));
    }
    
    private static String clean(StackTraceElement point) {
        return point.toString().replace(Debug.class.getPackage().getName() + ".", "");
    }
}
