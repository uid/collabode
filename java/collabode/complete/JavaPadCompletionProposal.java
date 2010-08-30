package collabode.complete;

@SuppressWarnings("restriction")
public class JavaPadCompletionProposal {
    
    public final String displayString;
    public final String replacementString;
    public final int replacementOffset;
    public final String imageName;
    public final String kind;
    
    JavaPadCompletionProposal(ProposalHolder holder) {
        replacementString = holder.proposal.getReplacementString();
        displayString = holder.proposal.getDisplayString();
        replacementOffset = holder.proposal.getReplacementOffset();
        imageName = holder.image;
        kind = holder.kind;
    }
}
