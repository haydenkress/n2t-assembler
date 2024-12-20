const fs = require('fs');
const path = require('path');

const inputFilePath = process.argv[2]; // First argument: Input file
const outputFilePath = process.argv[3]; // Second argument: Output file

// Converts paths to absolute paths
const resolvedInputPath = path.resolve(inputFilePath);
const resolvedOutputPath = path.resolve(outputFilePath);

// checks if both files are included before proceeding
if (!inputFilePath || !outputFilePath) {
    console.error("Usage: node file-handler.js <inputFilePath> <outputFilePath>");
    process.exit(1);
}

const symbolTable = {
    "RO": 0,
    "R1": 1,
    "R2": 2,
    "R3": 3,
    "R4": 4,
    "R5": 5,
    "R6": 6,
    "R7": 7,
    "R8": 8,
    "R9": 9,
    "R10": 10,
    "R11": 11,
    "R12": 12,
    "R13": 13,
    "R14": 14,
    "R15": 15,
    "SCREEN": 16384,
    "KBD": 24576,
    "SP": 0,
    "LCL": 1,
    "ARG": 2,
    "THIS": 3,
    "THAT": 4,
};

// Function to read, process, and write to the output file
const processAssemblyFile = (inputPath, outputPath) => {
    try {
        // Read the file content
        const fileContent = fs.readFileSync(inputPath, 'utf-8');
        const lines = fileContent.split('\n');
        const processedLines = [];
        let instructionCount = 0;

        // Array to store processed lines
        lines.forEach((line) => {
            line = line.split("//")[0].trim(); // Remove inline comments and trim
            if (!line) return; // Skip empty lines
        
            if (line.startsWith('(') && line.endsWith(')')) {
                symbolTable[line.slice(1, -1)] = instructionCount; // Add label to symbol table
                return; // Skip labels
            }
        
            processedLines.push(line); // Add valid instruction to processedLines
            instructionCount++; // Increment instruction count
        });
        
        // Second pass: Resolve symbols and translate to binary
        let nextAvailableAddress = 16;
        const resolvedLines = processedLines.map((line) => {
            if (line.startsWith('@')) {
                const symbol = line.slice(1);
                if (isNaN(symbol)) {
                    if (!(symbol in symbolTable)) {
                        symbolTable[symbol] = nextAvailableAddress++;
                    }
                    return `@${symbolTable[symbol]}`;
                }
            }
            return line;
        });

        const translateAInstruction = (line) => {
            const address = parseInt(line.slice(1));
            return `0${address.toString(2).padStart(15, '0')}`;
        };
        
        // M=M+1;JMP
        const translateCInstruction = (line) => {
            const compTable = {
                "0": "0101010", "1": "0111111", "-1": "0111010", "D": "0001100",
                "A": "0110000", "!D": "0001101", "!A": "0110001", "-D": "0001111",
                "-A": "0110011", "D+1": "0011111", "A+1": "0110111", "D-1": "0001110",
                "A-1": "0110010", "D+A": "0000010", "D-A": "0010011", "A-D": "0000111",
                "D&A": "0000000", "D|A": "0010101", "M": "1110000", "!M": "1110001",
                "-M": "1110011", "M+1": "1110111", "M-1": "1110010", "D+M": "1000010",
                "D-M": "1010011", "M-D": "1000111", "D&M": "1000000", "D|M": "1010101"
            };
            const destTable = {
                "null": "000", "M": "001", "D": "010", "MD": "011",
                "A": "100", "AM": "101", "AD": "110", "AMD": "111"
            };
            const jumpTable = {
                "null": "000", "JGT": "001", "JEQ": "010", "JGE": "011",
                "JLT": "100", "JNE": "101", "JLE": "110", "JMP": "111"
            };
        
            const [destComp, jump] = line.split(';');
            const [dest, comp] = destComp.includes('=') ? destComp.split('=') : [null, destComp];
        
            return `111${compTable[comp]}${destTable[dest || "null"]}${jumpTable[jump || "null"]}`;
        };

        const translateToBinary = (line) => {
            if (line.startsWith('@')) return translateAInstruction(line);
            return translateCInstruction(line);
        };

        const binaryLines = resolvedLines.map(translateToBinary);


        // Write the processed lines to the output file
        fs.writeFileSync(outputPath, binaryLines.join('\n'), 'utf-8');
        console.log(`Processed content written to ${outputPath}`);
        console.log(symbolTable);
    } catch (err) {
        console.error(`Error processing file: ${err.message}`);
    };
};

// Run the program with the given file paths
processAssemblyFile(resolvedInputPath, resolvedOutputPath);

