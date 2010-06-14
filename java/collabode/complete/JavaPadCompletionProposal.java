package collabode.complete;

import org.eclipse.jdt.internal.ui.text.java.AbstractJavaCompletionProposal;
import org.eclipse.jdt.ui.text.java.IJavaCompletionProposal;

@SuppressWarnings("restriction")
public class JavaPadCompletionProposal {
    
    private final String displayString;
    private final String replacementString;
    private final int replacementLength;
    private final int replacementOffset;
    
    public JavaPadCompletionProposal(IJavaCompletionProposal proposal) {
        AbstractJavaCompletionProposal jproposal = (AbstractJavaCompletionProposal)proposal;
        replacementString = jproposal.getReplacementString();
        displayString = jproposal.getDisplayString();
        replacementLength = jproposal.getReplacementLength();
        replacementOffset = jproposal.getReplacementOffset();
    }
    
    public String getDisplayString() {
        return displayString;
    }
    
    public String getReplacementString() {
        return replacementString;
    }
    
    public int getReplacementLength() {
        return replacementLength;
    }
    
    public int getReplacementOffset() {
        return replacementOffset;
    }
}
