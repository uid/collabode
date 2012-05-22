package collabode.complete;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.eclipse.jdt.core.*;
import org.eclipse.jdt.internal.ui.JavaPluginImages;
import org.eclipse.jdt.internal.ui.text.java.AbstractJavaCompletionProposal;
import org.eclipse.jdt.internal.ui.viewsupport.JavaElementImageProvider;
import org.eclipse.jdt.ui.text.java.*;
import org.eclipse.jface.resource.ImageDescriptor;
import org.eclipse.jface.text.IDocument;
import org.eclipse.jface.text.contentassist.IContextInformation;
import org.eclipse.swt.graphics.Image;
import org.eclipse.swt.graphics.Point;

/**
 * Implementation of a <code>CompletionRequestor</code>.
 */
@SuppressWarnings("restriction")
public class JavaPadCompletionProposalCollector extends CompletionProposalCollector {
    
    private static final Comparator<ProposalHolder> COMPARE = new Comparator<ProposalHolder>() {
        private final CompletionProposalComparator compare = new CompletionProposalComparator();
        public int compare(ProposalHolder p1, ProposalHolder p2) {
            return compare.compare(p1.proposal, p2.proposal);
        }
    };
    
    private static final Pattern IMGPATTERN = Pattern.compile("URLImageDescriptor\\(.*/(.*)\\)");
    
    public static final String METHOD_REF_NO_ARGS = "METHOD_REF_NO_ARGS";
    public static final String METHOD_REF_ARGS = "METHOD_REF_ARGS";
    public static final String OTHER = "OTHER";
    
    /**
     * Creates a new instance ready to collect proposals.
     */
    public JavaPadCompletionProposalCollector(ICompilationUnit cu) {
        super(cu);
    }
    
    /**
     * Creates a new Java completion proposal from a core proposal.
     * Overrides superclass to add logic from
     * {@link org.eclipse.jdt.ui.text.java.CompletionProposalLabelProvider#createImageDescriptor(org.eclipse.jdt.core.CompletionProposal)}
     * and compute image descriptors without turning them into {@link org.eclipse.jdt.ui.JavaElementImageDescriptor}s.
     */
    @Override protected IJavaCompletionProposal createJavaCompletionProposal(CompletionProposal proposal) {
        AbstractJavaCompletionProposal aProposal = (AbstractJavaCompletionProposal)super.createJavaCompletionProposal(proposal);
        
        String kind = OTHER;
        final int flags = proposal.getFlags();
        ImageDescriptor descriptor = null;
        switch (proposal.getKind()) {
            case CompletionProposal.METHOD_DECLARATION:
            case CompletionProposal.METHOD_NAME_REFERENCE:
            case CompletionProposal.METHOD_REF:
                kind =  (proposal.getSignature()[1] == ')') ? METHOD_REF_NO_ARGS : METHOD_REF_ARGS;
            case CompletionProposal.CONSTRUCTOR_INVOCATION:
            case CompletionProposal.METHOD_REF_WITH_CASTED_RECEIVER:
            case CompletionProposal.ANNOTATION_ATTRIBUTE_REF:
            case CompletionProposal.POTENTIAL_METHOD_DECLARATION:
            case CompletionProposal.ANONYMOUS_CLASS_DECLARATION:
            case CompletionProposal.ANONYMOUS_CLASS_CONSTRUCTOR_INVOCATION:
                descriptor= JavaElementImageProvider.getMethodImageDescriptor(false, flags);
                break;
            case CompletionProposal.TYPE_REF:
                switch (Signature.getTypeSignatureKind(proposal.getSignature())) {
                    case Signature.CLASS_TYPE_SIGNATURE:
                        descriptor= JavaElementImageProvider.getTypeImageDescriptor(false, false, flags, false);
                        break;
                    case Signature.TYPE_VARIABLE_SIGNATURE:
                        descriptor= JavaPluginImages.DESC_OBJS_TYPEVARIABLE;
                        break;
                    default:
                        descriptor= null;
                }
                break;
            case CompletionProposal.FIELD_REF:
            case CompletionProposal.FIELD_REF_WITH_CASTED_RECEIVER:
                descriptor= JavaElementImageProvider.getFieldImageDescriptor(false, flags);
                break;
            case CompletionProposal.LOCAL_VARIABLE_REF:
            case CompletionProposal.VARIABLE_DECLARATION:
                descriptor= JavaPluginImages.DESC_OBJS_LOCAL_VARIABLE;
                break;
            case CompletionProposal.PACKAGE_REF:
                descriptor= JavaPluginImages.DESC_OBJS_PACKAGE;
                break;
            case CompletionProposal.JAVADOC_METHOD_REF:
            case CompletionProposal.JAVADOC_TYPE_REF:
            case CompletionProposal.JAVADOC_FIELD_REF:
            case CompletionProposal.JAVADOC_VALUE_REF:
            case CompletionProposal.JAVADOC_BLOCK_TAG:
            case CompletionProposal.JAVADOC_INLINE_TAG:
            case CompletionProposal.JAVADOC_PARAM_REF:
                descriptor = JavaPluginImages.DESC_OBJS_JAVADOCTAG;
                break;
        }
        
        if (descriptor != null) {
            Matcher m = IMGPATTERN.matcher(descriptor.toString());
            if (m.matches()) {
                return new ProposalHolder(aProposal, m.group(1), kind);
            }
        }
        
        return new ProposalHolder(aProposal, null, kind);
    }
    
    /**
     * Returns the sorted list of received proposals.
     */
    public JavaPadCompletionProposal[] getSortedJavaPadCompletionProposals() {
        IJavaCompletionProposal[] proposalHolders = getJavaCompletionProposals();
        
        SortedSet<ProposalHolder> sortedHolders = new TreeSet<ProposalHolder>(COMPARE);
        for (IJavaCompletionProposal proposal : proposalHolders){
            if ( ! (proposal instanceof ProposalHolder)) {
                System.err.println("Unhandled completion proposal " + proposal); // XXX
                continue;
            }
            sortedHolders.add((ProposalHolder)proposal);
        }
        List<JavaPadCompletionProposal> padProposals = new ArrayList<JavaPadCompletionProposal>(proposalHolders.length);
        for (ProposalHolder holder : sortedHolders) {
            padProposals.add(new JavaPadCompletionProposal(holder));
        }
        
        return padProposals.toArray(new JavaPadCompletionProposal[padProposals.size()]);
    }
}

/**
 * A temporary holder of a Java completion proposal together with its image name.
 * Implements <code>IJavaCompletionProposal</code> so they can be returned from
 * <code>createJavaCompletionProposal(CompletionProposal)</code>.
 */
@SuppressWarnings("restriction")
class ProposalHolder implements IJavaCompletionProposal {
    
    public final AbstractJavaCompletionProposal proposal;
    public final String image;
    public final String kind;
    
    ProposalHolder(AbstractJavaCompletionProposal proposal, String image, String kind) {
        this.proposal = proposal;
        this.image = image;
        this.kind = kind;
    }

    public void apply(IDocument document) { }
    public Point getSelection(IDocument document) { return null; }
    public String getAdditionalProposalInfo() { return null; }
    public String getDisplayString() { return null; }
    public Image getImage() { return null; }
    public IContextInformation getContextInformation() { return null; }
    public int getRelevance() { return 0; }
}
