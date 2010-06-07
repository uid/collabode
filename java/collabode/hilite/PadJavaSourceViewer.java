package collabode.hilite;

import org.eclipse.jdt.internal.ui.javaeditor.JavaSourceViewer;
import org.eclipse.jface.text.*;
import org.eclipse.swt.widgets.Composite;

import collabode.JavaPadDocument;

@SuppressWarnings("restriction")
class PadJavaSourceViewer extends JavaSourceViewer implements IDocumentListener {
    private final JavaPadDocument doc;
    
    PadJavaSourceViewer(JavaPadDocument doc) {
        super(null, null, null, false, 0, null);
        this.doc = doc;
        doc.addDocumentListener(this);
    }
    
    @Override protected void createControl(Composite parent, int styles) {
        // do nothing
    }
    
    @Override public IDocument getDocument() {
        return doc;
    }
    
    @Override public void changeTextPresentation(TextPresentation presentation, boolean controlRedraw) {
        // only listener should be the {@link SemanticHighlightingPresenter}
        if (fTextPresentationListeners != null) {
            for (Object listener : fTextPresentationListeners) { // XXX not thread safe
                ((ITextPresentationListener)listener).applyTextPresentation(presentation);
            }
        }
        // then just tell the document about the new presentation
        doc.changeTextPresentation(presentation);
    }
    
    public void documentAboutToBeChanged(DocumentEvent event) { }
    
    public void documentChanged(DocumentEvent event) {
        // only listener should be the {@link JavaPresentationReconciler}'s
        // {@link PresentationReconciler#InternalListener}
        if (fTextListeners != null) {
            for (Object listener : fTextListeners) { // XXX not thread safe
                ((ITextListener)listener).textChanged(new PadDocumentEventTextEvent(event));
            }
        }
    }
}

/**
 * {@link TextEvent}s for consumption by XXX.
 */
class PadDocumentEventTextEvent extends TextEvent {
    protected PadDocumentEventTextEvent(DocumentEvent event) {
        super(event.getOffset(), event.getLength(), null, null, event, true);
    }
}
