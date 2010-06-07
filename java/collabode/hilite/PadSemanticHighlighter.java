package collabode.hilite;

import org.eclipse.jdt.internal.ui.JavaPlugin;
import org.eclipse.jdt.internal.ui.javaeditor.SemanticHighlightingManager;
import org.eclipse.jdt.internal.ui.text.JavaColorManager;
import org.eclipse.jdt.ui.PreferenceConstants;
import org.eclipse.jdt.ui.text.IJavaPartitions;
import org.eclipse.ui.PlatformUI;

import collabode.JavaPadDocument;

/**
 * Wrapper for {@link SemanticHighlightingManager} to operate on a {@link JavaPadDocument}.
 * Also acts as a messenger to pass along reconcile events.
 */
@SuppressWarnings("restriction")
public class PadSemanticHighlighter {
    static final JavaColorManager COLORS = new JavaColorManager(false);
    
    private final PadCompilationUnitEditor editor;
    private final PadJavaSourceViewer viewer;
    
    public PadSemanticHighlighter(final JavaPadDocument doc) {
        editor = new PadCompilationUnitEditor();
        viewer = new PadJavaSourceViewer(doc);
        
        JavaPlugin.getDefault().getJavaTextTools().setupJavaDocumentPartitioner(doc, IJavaPartitions.JAVA_PARTITIONING);
        
        PlatformUI.getWorkbench().getDisplay().syncExec(new Runnable() {
            public void run() {
                editor.config.getPresentationReconciler(viewer).install(viewer); // standard highlighting
                new SemanticHighlightingManager().install(editor, viewer, COLORS, PreferenceConstants.getPreferenceStore());
            }
        });
        
        doc.addReconcileListener(editor);
    }
}
