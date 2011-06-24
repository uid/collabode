package collabode;

public class Annotation {
    
    public final int lineNumber;
    public final String subtype;
    public final String message;
    
    public Annotation(int lineNumber, String subtype, String message) {
        this.lineNumber = lineNumber;
        this.subtype = subtype;
        this.message = message;
    }
}
