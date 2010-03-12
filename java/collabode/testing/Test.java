package collabode.testing;

import org.eclipse.jdt.junit.model.ITestCaseElement;

/**
 * Represents a single test method.
 */
public class Test {
    /**
     * Unique test name.
     */
    public final String name;
    /**
     * Test class name. 
     */
    public final String className;
    /**
     * Test method name.
     */
    public final String methodName;
    
    Test(ITestCaseElement elt) {
        className = elt.getTestClassName();
        methodName = elt.getTestMethodName();
        name = className + "." + methodName; // XXX can overload test method names?
    }
    
    @Override public boolean equals(Object obj) {
        return (obj instanceof Test) && ((Test)obj).name.equals(name);
    }
    
    @Override public int hashCode() {
        return name.hashCode();
    }
    
    @Override public String toString() {
        return "Test<" + name + ">";
    }
}
