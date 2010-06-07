package collabode;

import org.eclipse.jdt.core.dom.CompilationUnit;

public interface JavaPadReconcileListener {
    public void reconciled(JavaPadDocument doc, CompilationUnit ast);
}
