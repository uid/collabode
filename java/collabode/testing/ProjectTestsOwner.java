package collabode.testing;

import static collabode.testing.TestSupportInitializer.PACKAGE;
import static collabode.testing.TestSupportInitializer.STATUSES;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.IResource;
import org.eclipse.jdt.core.*;
import org.eclipse.jdt.junit.model.*;

import scala.Function1;
import scala.Function2;
import collabode.*;

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
    private List<Test> order = new ArrayList<Test>();
    private final ConcurrentMap<Test, TestResult> results = new ConcurrentHashMap<Test, TestResult>();
    private final ConcurrentMap<String, NavigableSet<MethodRelevance>> rankedCoverage = new ConcurrentHashMap<String, NavigableSet<MethodRelevance>>();
    
    private ProjectTestsOwner(IJavaProject project) {
        this.project = project;
    }
    
    /**
     * Is the project using test-driven development annotations?
     */
    public boolean isTestDriven() throws JavaModelException {
        for (IClasspathEntry entry : project.getRawClasspath()) {
            if (entry.getEntryKind() == IClasspathEntry.CPE_CONTAINER
                    && entry.getPath().equals(TestSupportInitializer.PATH)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Schedule test execution.
     */
    public void scheduleRun() {
        ContinuousTesting.getTester().runTests(project.getProject());
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
        
        if ( ! tests.equals(order)) {
            order = tests;
            reportOrder();
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
    
    private void reportOrder() {
        Workspace.scheduleTask("testOrder", project.getProject(), order.toArray());
    }
    
    /**
     * Report all current test results.
     */
    public void reportResults(Function1<Object[],Boolean> orderer, Function2<Test,TestResult,Boolean> resulter) {
        orderer.apply(order.toArray());
        for (Test test : results.keySet()) {
            resulter.apply(test, results.get(test));
        }
    }
    
    public ChangeSetOpIterator advanceStatus(String className, String methodName, String from, Function1<IResource,JavaPadDocument> getDocument) throws JavaModelException {
        JavaPadDocument doc = getDocument.apply(project.findType(className).getUnderlyingResource());
        String to = STATUSES.get(STATUSES.indexOf(from) + 1);
        return doc.setAnnotation(new String[] { PACKAGE, from }, new String[] { PACKAGE, to }, className, methodName, new String[0]);
    }
    
    void update(Coverage coverage) {
        computeRelevance(coverage.calls);
    }
    
    private void computeRelevance(Map<IMethod, Map<IMethod, Integer>> calls) {
        rankedCoverage.clear();
        
        Map<IMethod, Double> idf = new HashMap<IMethod, Double>();
        for (Map<IMethod, Integer> val : calls.values()) {
            for (IMethod call : val.keySet()) {
                Double count = idf.get(call);
                idf.put(call, count == null ? 1 : count+1);
            }
        }
        for (Map.Entry<IMethod, Double> entry : idf.entrySet()) {
            entry.setValue(Math.log(calls.size() / entry.getValue()));
        }
        for (Map.Entry<IMethod, Map<IMethod, Integer>> test : calls.entrySet()) {
            NavigableSet<MethodRelevance> set;
            IMethod method = test.getKey();
            String name = method.getDeclaringType().getFullyQualifiedName() + "." + method.getElementName();
            rankedCoverage.put(name, set = new TreeSet<MethodRelevance>());
            for (Map.Entry<IMethod, Integer> call : test.getValue().entrySet()) {
                set.add(new MethodRelevance(call.getKey(), call.getValue() * idf.get(call.getKey())));
            }
        }
    }
    
    public IMethod getMethod(String className, String methodName) throws JavaModelException {
        return project.findType(className).getMethod(methodName, new String[0]);
    }
    
    public NavigableSet<MethodRelevance> getCoverage(String className, String methodName) {
        return rankedCoverage.get(className + "." + methodName);
    }
}
