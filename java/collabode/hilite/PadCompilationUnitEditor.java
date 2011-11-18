package collabode.hilite;

import static collabode.hilite.PadSemanticHighlighter.COLORS;
import static org.eclipse.jdt.ui.text.IJavaPartitions.JAVA_PARTITIONING;

import org.eclipse.core.runtime.NullProgressMonitor;
import org.eclipse.jdt.core.dom.CompilationUnit;
import org.eclipse.jdt.internal.ui.javaeditor.CompilationUnitEditor;
import org.eclipse.jdt.ui.PreferenceConstants;
import org.eclipse.jdt.ui.text.JavaSourceViewerConfiguration;
import org.eclipse.jface.action.MenuManager;
import org.eclipse.jface.viewers.ISelectionProvider;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.ui.*;

import collabode.Application;
import collabode.JavaPadDocument;
import collabode.JavaPadReconcileListener;

@SuppressWarnings("restriction")
class PadCompilationUnitEditor extends CompilationUnitEditor implements JavaPadReconcileListener {
    
    final JavaSourceViewerConfiguration config = new JavaSourceViewerConfiguration(COLORS, PreferenceConstants.getPreferenceStore(), null, JAVA_PARTITIONING);
    
    @Override public IWorkbenchPartSite getSite() {
        return NullWorkbenchPartSite.SITE;
    }
    
    @Override protected JavaSourceViewerConfiguration createJavaSourceViewerConfiguration() {
        // eventually JavaSourceViewerConfiguration#getPresentationReconciler(ISourceViewer)
        //   will be called on the return
        // XXX supposedly we should create a new one
        return config;
    }
    
    public void reconciled(JavaPadDocument doc, final CompilationUnit ast) {
        // the SemanticHighlightingReconciler added itself as an IJavaReconcilingListener
        PlatformUI.getWorkbench().getDisplay().asyncExec(new Runnable() {
            public void run() {
                reconciled(ast, false, new NullProgressMonitor());
            }
        });
    }
}

// Just needs to return a valid Shell for getShell()
@SuppressWarnings({ "deprecation", "rawtypes" })
class NullWorkbenchPartSite implements IWorkbenchPartSite {
    static final NullWorkbenchPartSite SITE = new NullWorkbenchPartSite();
    
    private NullWorkbenchPartSite() { }
    
    public IWorkbenchPage getPage() { return null; }
    public ISelectionProvider getSelectionProvider() { return null; }
    public Shell getShell() { return Application.SHELL; }
    public IWorkbenchWindow getWorkbenchWindow() { return null; }
    public void setSelectionProvider(ISelectionProvider provider) { }
    public Object getAdapter(Class adapter) { return null; }
    public Object getService(Class api) { return null; }
    public boolean hasService(Class api) { return false; }
    public String getId() { return null; }
    public String getPluginId() { return null; }
    public String getRegisteredName() { return null; }
    public void registerContextMenu(String menuId, MenuManager menuManager, ISelectionProvider selectionProvider) { }
    public void registerContextMenu(MenuManager menuManager, ISelectionProvider selectionProvider) { }
    public IKeyBindingService getKeyBindingService() { return null; }
    public IWorkbenchPart getPart() { return null; }
}
