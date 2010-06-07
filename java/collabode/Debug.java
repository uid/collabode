package collabode;

/**
 * Debugging support.
 */
public class Debug {
    
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
}
