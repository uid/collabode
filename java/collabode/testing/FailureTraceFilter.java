package collabode.testing;

import java.io.*;

import org.eclipse.jdt.internal.junit.JUnitPreferencesConstants;

/**
 * Test trace filtering.
 * XXX Duplicated from {@link org.eclipse.jdt.internal.junit.ui.TextualTrace}.
 */
@SuppressWarnings("restriction")
class FailureTraceFilter {
    
    private static final String[] patterns = getFilterPatterns();
    
    private static String[] getFilterPatterns() { // XXX duplicated from org.eclipse.jdt.internal.junit.ui.FailureTrace
        if (JUnitPreferencesConstants.getFilterStack())
            return JUnitPreferencesConstants.getFilterPatterns();
        return new String[0];
    }
    
    private static boolean filterLine(String line) {
        String pattern;
        int len;
        for (int i = (patterns.length - 1); i >= 0; --i) {
            pattern = patterns[i];
            len = pattern.length() - 1;
            if (pattern.charAt(len) == '*') {
                // strip trailing * from a package filter
                pattern = pattern.substring(0, len);
            } else if (Character.isUpperCase(pattern.charAt(0))) {
                // class in the default package
                pattern = "at " + pattern + '.'; // XXX was FailureTrace.FRAME_PREFIX
            } else {
                // class names start w/ an uppercase letter after the .
                final int lastDotIndex = pattern.lastIndexOf('.');
                if ((lastDotIndex != -1)
                    && (lastDotIndex != len)
                    && Character.isUpperCase(pattern.charAt(lastDotIndex + 1)))
                    pattern += '.'; // append . to a class filter
            }

            if (line.indexOf(pattern) > 0)
                return true;
        }
        return false;
    }
    
    static String filterStack(String stackTrace) {
        if (patterns.length == 0 || stackTrace == null)
            return stackTrace;

        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);
        StringReader stringReader = new StringReader(stackTrace);
        BufferedReader bufferedReader = new BufferedReader(stringReader);

        String line;
        try {
            while ((line = bufferedReader.readLine()) != null) {
                if (!filterLine(line))
                    printWriter.println(line);
            }
        } catch (IOException e) {
            return stackTrace; // return the stack unfiltered
        }
        return stringWriter.toString();
    }
}
