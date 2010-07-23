package collabode.testing;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.eclipse.core.resources.IProject;
import org.eclipse.jdt.core.IJavaProject;
import org.eclipse.jdt.core.JavaCore;
import org.eclipse.jdt.junit.model.ITestCaseElement;
import org.eclipse.jdt.junit.model.ITestElement;
import org.eclipse.jdt.junit.model.ITestElementContainer;

import scala.Function2;
import collabode.Workspace;

/**
 * Keeps track of continuous test results for a project.
 */
public class ProjectTestsOwner {
    
    private static final ConcurrentMap<IJavaProject, ProjectTestsOwner> RESULTS = new ConcurrentHashMap<IJavaProject, ProjectTestsOwner>(); 

    public static ProjectTestsOwner of(IProject project) {
        return of(JavaCore.create(project));
    }
    
    public static ProjectTestsOwner of(IJavaProject project) {
        if ( ! RESULTS.containsKey(project)) {
            RESULTS.putIfAbsent(project, new ProjectTestsOwner(project));
        }
        return RESULTS.get(project);
    }
    
    final IJavaProject project;
    private final ConcurrentMap<Test, TestResult> results = new ConcurrentHashMap<Test, TestResult>();
    
    private ProjectTestsOwner(IJavaProject project) {
        this.project = project;
    }
    
    /**
     * Update the recorded test results with new or changed results.
     * Reports any change.
     */
    void update(ITestCaseElement elt) {
        Test test = new Test(elt);
        TestResult result = new TestResult(elt, project);
        if ( ! results.containsKey(test)) {
            results.put(test, result);
        } else if ( ! result.equals(results.get(test))) {
            results.put(test, result);
        } else {
            return;
        }
        reportAdd(test, result);
    }
    
    /**
     * Update the recorded test results to remove no-longer-run tests.
     * Reports any changes.
     */
    public void update(ITestElementContainer container) {
        Set<Test> wontRun = new HashSet<Test>(results.keySet());
        List<Test> tests = new ArrayList<Test>();
        findTests(container, tests);
        wontRun.removeAll(tests);
        
        results.keySet().removeAll(wontRun);
        for (Test test : wontRun) {
            reportRemove(test);
        }
    }
    
    /**
     * Update the recorded test results to remove all tests.
     * Reports any changes.
     */
    public void empty() {
        Set<Test> wontRun = new HashSet<Test>(results.keySet());
        results.clear();
        for (Test test : wontRun) {
            reportRemove(test);
        }
    }
    
    private static void findTests(ITestElementContainer container, Collection<Test> tests) {
        for (ITestElement elt : container.getChildren()) {
            if (elt instanceof ITestElementContainer) {
                findTests((ITestElementContainer)elt, tests);
            } else if (elt instanceof ITestCaseElement) {
                tests.add(new Test((ITestCaseElement)elt));
            } else {
                throw new IllegalArgumentException(elt.getClass().getCanonicalName());
            }
        }
    }
    
    private void reportAdd(Test test, TestResult result) {
        Workspace.scheduleTask("testResult", project.getProject(), test, result);
    }
    
    private void reportRemove(Test test) {
        Workspace.scheduleTask("testResult", project.getProject(), test, null);
    }
    
    /**
     * Report all current test results.
     */
    public void reportResults(Function2<Test,TestResult,Boolean> reporter) {
        for (Test test : results.keySet()) {
            reporter.apply(test, results.get(test));
        }
    }
}
