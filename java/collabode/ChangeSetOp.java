package collabode;

import java.util.List;

public class ChangeSetOp {
    public final char opcode; // XXX actually ignored
    public final int lines;
    public final int chars;
    public final String[][] attribs;

    ChangeSetOp(char opcode, int lines, int chars, String[][] attribs) {
        this.opcode = opcode;
        this.lines = lines;
        this.chars = chars;
        this.attribs = attribs;
    }
    
    ChangeSetOp(char opcode, int lines, int chars, List<String[]> attribs) {
        this.opcode = opcode;
        this.lines = lines;
        this.chars = chars;
        this.attribs = attribs.toArray(new String[0][]);
    }

    @Override public String toString() {
        return lines > 0 ? "|" + lines + "" + opcode + "" + chars + "*"
                + attribString() : opcode + "" + chars + "*" + attribString();
    }

    private String attribString() {
        StringBuilder b = new StringBuilder();
        for (String[] attrib : attribs) {
            b.append("(").append(attrib[0]).append(",").append(attrib[1]).append(")");
        }
        return b.toString();
    }
}
