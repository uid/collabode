package collabode.testing;

import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.*;
import java.util.concurrent.CopyOnWriteArraySet;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jdt.core.*;
import org.eclipse.jdt.launching.SocketUtil;

class Coverage implements Runnable {
    
    public static final String PORT = "JACTO_PORT";
    
    private static final int EVENT = 0, CLASS = 1, NAME = 2, ARGS = 3;
    
    private static final String CONSTRUCTOR = "<init>";
    
    private static final Set<CoverageListener> listeners = new CopyOnWriteArraySet<CoverageListener>();
    
    public static void addCoverageListener(CoverageListener listener) {
        listeners.add(listener);
    }
    
    final int port;
    final IJavaProject project;
    final Map<IMethod, Map<IMethod, Integer>> calls;
    
    private Map<IMethod, Integer> current;
    
    Coverage(IJavaProject project) {
        this.port = SocketUtil.findFreePort();
        this.project = project;
        this.calls = new HashMap<IMethod, Map<IMethod, Integer>>();
        new Thread(this, getClass().getSimpleName() + " " + project.getElementName()).start();
    }
    
    public void run() {
        try {
            Socket socket = new ServerSocket(port).accept();
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            String line;
            while ((line = in.readLine()) != null) {
                String[] parts = line.split(" ");
                try {
                    Parse.valueOf(parts[EVENT]).handle(this, parts);
                } catch (JavaModelException jme) {
                    jme.printStackTrace(); // XXX
                }
            }
            notifyListeners();
        } catch (IOException ioe) {
            ioe.printStackTrace(); // XXX
        }
    }
    
    private static enum Parse {
        test {
            void handle(Coverage self, String[] parts) throws JavaModelException {
                self.test(parts[CLASS], parts[NAME]);
            }
        },
        call {
            void handle(Coverage self, String[] parts) throws JavaModelException {
                self.call(parts[CLASS], parts[NAME], Arrays.copyOfRange(parts, ARGS, parts.length));
            }
        };
        
        abstract void handle(Coverage self, String[] parts) throws JavaModelException;
    }
    
    private void test(String clazz, String method) throws JavaModelException {
        IMethod test = project.findType(clazz).getMethod(method, new String[0]);
        calls.put(test, current = new HashMap<IMethod, Integer>());
    }
    
    private void call(String clazz, String member, String[] params) throws JavaModelException {
        String method = member.equals(CONSTRUCTOR) ? Signature.getSimpleName(clazz) : member;
        
        // XXX sometimes we have e.g. java.lang.String[] which should be [Ljava.lang.String;
        // XXX but sometimes we have e.g. T (a type parameter) which should be QT;
        for (int ii = 0; ii < params.length; ii++) {
            params[ii] = Signature.createTypeSignature(params[ii], false); // XXX call everything unresolved
        }
        
        IType type = project.findType(clazz, (IProgressMonitor)null);
        
        // XXX getMethod(...) needs types to match exactly, e.g. QString; != Ljava.lang.String;
        // XXX findMethods(...) does better
        IMethod[] call = type.findMethods(type.getMethod(method, params)); // XXX need a better way
        
        // might be calling the implicit constructor
        if (call == null && member.equals(CONSTRUCTOR) && params.length == 0) { return; }
        
        Integer count = current.get(call[0]);
        current.put(call[0], count == null ? 1 : count+1);
    }
    
    private void notifyListeners() {
        for (CoverageListener listener : listeners) {
            listener.coverage(this);
        }
    }
    
    @Override public String toString() {
        return getClass().getSimpleName() + "<" + project.getElementName() + "," + calls + ">";
    }
}

interface CoverageListener {
    
    void coverage(Coverage coverage);
    
}
