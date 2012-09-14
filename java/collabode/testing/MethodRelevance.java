package collabode.testing;

import org.eclipse.jdt.core.IMethod;

public class MethodRelevance implements Comparable<MethodRelevance> {
    
    public final IMethod method;
    public final double relevance;
    
    public MethodRelevance(IMethod method, double relevance) {
        this.method = method;
        this.relevance = relevance;
    }
    
    public int compareTo(MethodRelevance other) {
        int compare = Double.compare(relevance, other.relevance);
        if (compare == 0) {
            return method.getHandleIdentifier().compareTo(other.method.getHandleIdentifier());
        }
        return compare;
    }
    
    @Override public String toString() {
        return method + "->" + relevance;
    }
}
