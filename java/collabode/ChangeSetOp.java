package collabode;

public class ChangeSetOp {
    public final String opcode;
    public final String text;
    public final String[][] attribs;
    
    ChangeSetOp(String opcode, String text, String[]... attribs) {
        this.opcode = opcode;
        this.text = text;
        this.attribs = attribs;
    }
}
