package collabode.collab;

import java.util.Collection;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

import collabode.JavaPadDocument;
import collabode.PadDocument;

public class JavaReconciler implements CollabListener, Runnable {
    
    private final BlockingQueue<PadDocument> queue = new LinkedBlockingQueue<PadDocument>();
    
    public JavaReconciler(Collab collab) {
        Thread thread = new Thread(this, getClass().getSimpleName() + " " + collab.id);
        thread.setPriority(Thread.MIN_PRIORITY);
        thread.start();
    }
    
    public void updated(PadDocument doc) {
        queue.add(doc);
    }
    
    public void committed(CollabDocument doc) {
    }
    
    public void run() {
        while (true) {
            try {
                PadDocument doc = queue.take();
                Collection<JavaPadDocument> others = doc.owner.documents(JavaPadDocument.class);
                queue.removeAll(others);
                for (JavaPadDocument other : others) {
                    if (doc.equals(other)) { continue; }
                    other.reconcile(true);
                }
            } catch (InterruptedException ie) {
                ie.printStackTrace(); // XXX
            }
        }
    }
}
