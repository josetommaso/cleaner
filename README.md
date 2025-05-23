# CSV Cleaner Tool

A command-line utility for processing and merging CSV files.

## Overview

This tool provides three main functionalities:

1. **Extract wallet addresses** from CSV files
2. **Extract token addresses** from CSV files
3. **Merge multiple CSV files** into a single file

## Installation

1. Make sure you have [Node.js](https://nodejs.org/) installed (version 12.x or higher)
2. Clone this repository
3. Install dependencies:
   ```
   npm install
   ```

## Directory Structure

The tool requires the following directory structure:

```
cleaner/
├── index.js
├── tokens/
│   └── tokens.csv
├── wallets/
│   └── [your wallet csv files]
└── merge/
    └── [your csv files to merge]
```

## Usage

### Extract Wallet Addresses

Extracts wallet addresses from CSV files in the `tokens` directory.

```
node index.js tokens
```

This command:
1. Reads the `tokens.csv` file in the `tokens` directory
2. Extracts all wallet addresses from the `token_address` column
3. Prompts you for an output filename
4. Creates a text file with all the extracted addresses (one per line)

### Extract Token Addresses

Extracts token addresses from CSV files in the `wallets` directory.

```
node index.js wallets
```

This command:
1. Reads all CSV files in the `wallets` directory
2. Extracts all wallet addresses from the `wallet_address` column
3. Removes duplicate addresses
4. Prompts you for an output filename
5. Creates a text file with all the extracted addresses (one per line)
6. Removes the original CSV files after processing

### Merge CSV Files

Merges multiple CSV files from the `merge` directory into a single file.

```
node index.js merge
```

This command:
1. Reads all CSV files in the `merge` directory
2. Combines them into a single CSV file (keeping the header from the first file)
3. Prompts you for an output filename
4. Creates a new CSV file with all the merged data
5. Removes the original CSV files after processing

## File Requirements

### For `tokens` command:
- CSV file named `tokens.csv` in the `tokens` directory
- File must have a column named `token_address`

### For `wallets` command:
- CSV files in the `wallets` directory
- Files must have a column named `wallet_address`

### For `merge` command:
- CSV files in the `merge` directory
- All files should have the same column structure

## Notes

- The tool handles CSV files with special characters and quoted fields
- When merging files, all rows from all files will be preserved (no duplicate removal)
- For large collections of wallet addresses, the tool will automatically split output into multiple files (39,000 addresses per file)
