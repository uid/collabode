package collabode;

import java.util.Arrays;

public class ChangeSetOp {
    public final String opcode;
    public final String text;
    public final String[][] attribs;
    
    ChangeSetOp(String opcode, String text, String[]... attribs) {
        this.opcode = opcode;
        this.text = text;
        this.attribs = attribs;
    }
    
    @Override public String toString() {
        String[] stringified = new String[attribs.length];
        for (int ii = 0; ii < attribs.length; ii++) {
            stringified[ii] = Arrays.toString(attribs[ii]);
        }
        return getClass().getSimpleName() + opcode + '"' + text.replaceAll("\n", "^") + '"' + Arrays.toString(stringified);
    }
}
