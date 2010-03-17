package collabode.testing;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;

import org.eclipse.jdt.core.*;
import org.eclipse.jdt.junit.model.ITestCaseElement;
import org.eclipse.jdt.junit.model.ITestElement.FailureTrace;
import org.eclipse.jdt.junit.model.ITestElement.Result;

/**
 * Represents a single test result
 */
public class TestResult {
    private final Result result;
    /**
     * Test failure trace.
     */
    public final FailureTrace trace;
    /**
     * Test evolution status.
     * Represented in code by a collabode.* annotation.
     */
    public final String status;
    
    TestResult(ITestCaseElement elt, IJavaProject project) {
        result = elt.getTestResult(true);
        trace = elt.getFailureTrace();
        status = getStatus(elt, project).toLowerCase();
    }
    
    private String getStatus(ITestCaseElement elt, IJavaProject project) {
        try {
            IType type = project.findType(elt.getTestClassName());
            IMethod method = type.getMethod(elt.getTestMethodName(), new String[0]);
            for (IAnnotation ann : method.getAnnotations()) {
                for (String[] name : type.resolveType(ann.getElementName())) {
                    if (name[0].equals("collabode")) {
                        return name[1];
                    }
                }
            }
        } catch (JavaModelException jme) {
            jme.printStackTrace();
        }
        return "New";
    }
    
    /**
     * Test outcome.
     */
    public String resultName() {
        try {
            for (Field field : Result.class.getDeclaredFields()) {
                if ( ! Modifier.isStatic(field.getModifiers())) { continue; }
                if (field.get(null) == result) {
                    return field.getName().toLowerCase();
                }
            }
        } catch (Exception e) { }
        return "unknown";
    }
    
    @Override public boolean equals(Object obj) {
        if ( ! (obj instanceof TestResult)) { return false; }
        TestResult other = (TestResult)obj;
        return result == other.result && equal(trace, other.trace) && status.equals(other.status);
    }
    
    private static boolean equal(FailureTrace t1, FailureTrace t2) {
        if (t1 == null && t2 == null) { return true; }
        if (t1 == null || t2 == null) { return false; }
        return equal(t1.getTrace(), t2.getTrace()) && equal(t1.getExpected(), t2.getExpected()) && equal(t1.getActual(), t2.getActual());
    }
    
    private static boolean equal(String s1, String s2) {
        return (s1 == null && s2 == null) || (s1 != null && s1.equals(s2));
    }
    
    @Override public int hashCode() {
        return 37 * result.hashCode() * trace.getTrace().hashCode() * status.hashCode();
    }
    
    @Override public String toString() {
        StringBuilder ret = new StringBuilder();
        ret.append("TestResult<").append(resultName());
        if (trace != null) {
            if (trace.getExpected() != null) {
                ret.append(":expected!=actual");
            } else {
                ret.append(":trace");
            }
        }
        ret.append(",").append(status).append(">");
        return ret.toString();
    }
}
