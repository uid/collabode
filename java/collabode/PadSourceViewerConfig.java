package collabode;
/*
import org.eclipse.jdt.ui.PreferenceConstants;
import org.eclipse.jdt.ui.text.IJavaPartitions;
import org.eclipse.jdt.ui.text.JavaSourceViewerConfiguration;
import org.eclipse.jdt.ui.text.JavaTextTools;
import org.eclipse.jface.text.IDocument;
import org.eclipse.jface.text.IRegion;
import org.eclipse.jface.text.TextPresentation;
import org.eclipse.jface.text.presentation.PresentationReconciler;
import org.eclipse.jface.text.rules.DefaultDamagerRepairer;

public class PadSourceViewerConfig extends JavaSourceViewerConfiguration {

    PadSourceViewerConfig() {
        super(new JavaTextTools(PreferenceConstants.getPreferenceStore()).getColorManager(), PreferenceConstants.getPreferenceStore(), null, IJavaPartitions.JAVA_PARTITIONING);
    }
    
    PadPresentationReconciler getPresentationReconciler() {
        PadPresentationReconciler reconciler = new PadPresentationReconciler();
        reconciler.setDocumentPartitioning(IJavaPartitions.JAVA_PARTITIONING);
        
        DefaultDamagerRepairer dr;
        dr = new DefaultDamagerRepairer(getCodeScanner());
        reconciler.setDamager(dr, IDocument.DEFAULT_CONTENT_TYPE);
        reconciler.setRepairer(dr, IDocument.DEFAULT_CONTENT_TYPE);
        
        dr= new DefaultDamagerRepairer(getJavaDocScanner());
        reconciler.setDamager(dr, IJavaPartitions.JAVA_DOC);
        reconciler.setRepairer(dr, IJavaPartitions.JAVA_DOC);
        
        dr= new DefaultDamagerRepairer(getMultilineCommentScanner());
        reconciler.setDamager(dr, IJavaPartitions.JAVA_MULTI_LINE_COMMENT);
        reconciler.setRepairer(dr, IJavaPartitions.JAVA_MULTI_LINE_COMMENT);
        
        dr= new DefaultDamagerRepairer(getSinglelineCommentScanner());
        reconciler.setDamager(dr, IJavaPartitions.JAVA_SINGLE_LINE_COMMENT);
        reconciler.setRepairer(dr, IJavaPartitions.JAVA_SINGLE_LINE_COMMENT);
        
        dr= new DefaultDamagerRepairer(getStringScanner());
        reconciler.setDamager(dr, IJavaPartitions.JAVA_STRING);
        reconciler.setRepairer(dr, IJavaPartitions.JAVA_STRING);
        
        dr= new DefaultDamagerRepairer(getStringScanner());
        reconciler.setDamager(dr, IJavaPartitions.JAVA_CHARACTER);
        reconciler.setRepairer(dr, IJavaPartitions.JAVA_CHARACTER);
        
        return reconciler;
    }
}

class PadPresentationReconciler extends PresentationReconciler {
    TextPresentation createRepairDescription(IRegion damage, IDocument document) {
        setDocumentToDamagers(document);
        setDocumentToRepairers(document);
        return createPresentation(damage, document);
    }
}
*/