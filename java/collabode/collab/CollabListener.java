package collabode.collab;

import collabode.PadDocument;

/**
 * Collaboration event listener.
 */
public interface CollabListener {
    void updated(PadDocument doc);
    void committed(CollabDocument doc);
}
