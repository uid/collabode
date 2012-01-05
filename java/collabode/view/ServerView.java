package collabode.view;

import org.eclipse.jface.action.Action;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.resource.ImageDescriptor;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.ui.part.ViewPart;
import org.eclipse.ui.plugin.AbstractUIPlugin;

import collabode.Application;

public class ServerView extends ViewPart {
    
    public ServerView() {
    }
    
    public void createPartControl(Composite parent) {
        Action start = new StartServerAction();
        getViewSite().getActionBars().getMenuManager().add(start);
        getViewSite().getActionBars().getToolBarManager().add(start);
    }
    
    public void setFocus() {
        // XXX e.g. viewer.getControl().setFocus();
    }
    
    private static ImageDescriptor imageDescriptor(String imageFilePath) {
        return AbstractUIPlugin.imageDescriptorFromPlugin(Application.ID, imageFilePath);
    }
    
    class StartServerAction extends Action {
        StartServerAction() {
            setText("Start server");
            setToolTipText("Start Collabode server");
            setImageDescriptor(imageDescriptor("src/static/img/eclipse/wst.server.ui.lcl.launch_publish.gif"));
        }
        
        @Override public void run() {
            try {
                Application.startInWorkbench(getSite().getShell());
                setEnabled(false);
                setText("Server started");
                setToolTipText("Collabode server started");
                setImageDescriptor(imageDescriptor("src/static/img/eclipse/wst.server.ui.obj.server_started.gif"));
            } catch (Exception e) {
                e.printStackTrace(); // XXX
                MessageDialog.openError(getSite().getShell(), "Error starting Collabode server", e.getMessage());
            }
        }
    }
}
