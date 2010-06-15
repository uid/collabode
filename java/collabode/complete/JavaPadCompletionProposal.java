package collabode.complete;

import org.eclipse.jdt.internal.ui.text.java.AbstractJavaCompletionProposal;
import org.eclipse.jdt.ui.text.java.IJavaCompletionProposal;

@SuppressWarnings("restriction")
public class JavaPadCompletionProposal {
    
    public final String displayString;
    public final String replacementString;
    public final int replacementLength;
    public final int replacementOffset;
    
    public JavaPadCompletionProposal(IJavaCompletionProposal proposal) {
        AbstractJavaCompletionProposal jproposal = (AbstractJavaCompletionProposal)proposal;
        replacementString = jproposal.getReplacementString();
        displayString = jproposal.getDisplayString();
        replacementLength = jproposal.getReplacementLength();
        replacementOffset = jproposal.getReplacementOffset();
    }
}
