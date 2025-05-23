#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { parse } = require('csv-parse');
const { promisify } = require('util');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define file paths
const baseDir = path.dirname(__filename);
const tokensDir = path.join(baseDir, 'tokens');
const walletsDir = path.join(baseDir, 'wallets');
const csvFilePath = path.join(tokensDir, 'tokens.csv');

// Main function to handle command line options
async function main() {
  const args = process.argv.slice(2);
  const option = args[0]?.toLowerCase();

  if (!option) {
    console.log('Please provide an option: "wallets" or "tokens"');
    rl.close();
    return;
  }

  switch (option) {
    case 'tokens':
      console.log('Starting wallet addresses extraction...');
      await processWallets();
      break;
    case 'wallets':
      console.log('Starting tokens option processing...');
      await processTokens();
      break;
    default:
      console.log('Invalid option. Please use "wallets" or "tokens"');
      rl.close();
  }
}

// Process wallets option - extract token addresses from CSV
async function processWallets() {
  try {
    // Check if CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Error: CSV file not found at ${csvFilePath}`);
      rl.close();
      return;
    }

    // Parse CSV and extract token addresses
    const tokenAddresses = await extractTokenAddresses();
    
    if (tokenAddresses.length === 0) {
      console.log('No token addresses found in the CSV file.');
      rl.close();
      return;
    }

    console.log(`Found ${tokenAddresses.length} token addresses.`);
    
    // Prompt user for output file name
    rl.question('Enter a name for the output file (without extension): ', (fileName) => {
      if (!fileName) {
        fileName = 'token_addresses';
      }
      
      // Ensure file has .txt extension
      if (!fileName.endsWith('.txt')) {
        fileName += '.txt';
      }
      
      const outputPath = path.join(tokensDir, fileName);
      
      // Write addresses to output file
      try {
        fs.writeFileSync(outputPath, tokenAddresses.join('\n'));
        console.log(`Token addresses successfully saved to ${outputPath}`);
      } catch (error) {
        console.error(`Error writing to file: ${error.message}`);
      }
      
      rl.close();
    });
  } catch (error) {
    console.error(`Error processing wallets: ${error.message}`);
    rl.close();
  }
}

// Extract token addresses from CSV file
function extractTokenAddresses() {
  return new Promise((resolve, reject) => {
    const tokenAddresses = [];
    
    // First read the file as text to handle special escape sequences
    fs.readFile(csvFilePath, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }
      
      try {
        // Process the CSV file line by line
        const lines = data.split('\n');
        const header = lines[0].split(',');
        const tokenAddressIndex = header.findIndex(col => col.trim() === 'token_address');
        
        if (tokenAddressIndex === -1) {
          return reject(new Error('token_address column not found in CSV'));
        }
        
        // Process each line (skipping header)
        for (let i = 1; i < lines.length; i++) {
          try {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse the line manually to handle special characters
            let inQuotes = false;
            let currentField = '';
            let fieldIndex = 0;
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              const nextChar = line[j + 1];
              
              // Handle escape sequences
              if (char === '\\' && nextChar === '"') {
                currentField += '"';
                j++; // Skip the next character (the quote)
              }
              // Start or end of quoted field
              else if (char === '"') {
                if (inQuotes && nextChar === '"') {
                  // Double quotes inside a quoted field = escaped quote
                  currentField += '"';
                  j++; // Skip the next quote
                } else {
                  // Toggle quote state
                  inQuotes = !inQuotes;
                }
              }
              // Field separator
              else if (char === ',' && !inQuotes) {
                if (fieldIndex === tokenAddressIndex) {
                  // Remove surrounding quotes if any
                  const cleanAddress = currentField.replace(/^"(.*)"$/, '$1');
                  if (cleanAddress) {
                    tokenAddresses.push(cleanAddress);
                  }
                }
                currentField = '';
                fieldIndex++;
              }
              // Normal character
              else {
                currentField += char;
              }
            }
            
            // Handle the last field
            if (fieldIndex === tokenAddressIndex) {
              const cleanAddress = currentField.replace(/^"(.*)"$/, '$1');
              if (cleanAddress) {
                tokenAddresses.push(cleanAddress);
              }
            }
          } catch (lineError) {
            console.warn(`Warning: Could not process line ${i + 1}: ${lineError.message}`);
          }
        }
        
        resolve(tokenAddresses);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

// Process tokens option - extract wallet addresses from all CSV files in wallets folder
async function processTokens() {
  try {
    // Check if wallets directory exists
    if (!fs.existsSync(walletsDir)) {
      console.error(`Error: Wallets directory not found at ${walletsDir}`);
      rl.close();
      return;
    }

    // Get all CSV files in the wallets directory
    const csvFiles = fs.readdirSync(walletsDir)
      .filter(file => file.toLowerCase().endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      console.error('No CSV files found in the wallets directory.');
      rl.close();
      return;
    }

    console.log(`Found ${csvFiles.length} CSV files in the wallets directory.`);
    
    // Extract wallet addresses from all CSV files
    const allWalletAddresses = [];
    const addressSet = new Set(); // For tracking duplicates
    let duplicateCount = 0;
    
    for (const csvFile of csvFiles) {
      const csvFilePath = path.join(walletsDir, csvFile);
      console.log(`Processing ${csvFile}...`);
      
      try {
        const addresses = await extractWalletAddresses(csvFilePath);
        
        // Count and remove duplicates
        for (const address of addresses) {
          if (addressSet.has(address)) {
            duplicateCount++;
          } else {
            addressSet.add(address);
            allWalletAddresses.push(address);
          }
        }
      } catch (error) {
        console.error(`Error processing ${csvFile}: ${error.message}`);
        rl.close();
        return;
      }
    }
    
    if (allWalletAddresses.length === 0) {
      console.log('No wallet addresses found in any of the CSV files.');
      rl.close();
      return;
    }
    
    const uniqueAddressCount = allWalletAddresses.length;
    console.log(`Found ${uniqueAddressCount} unique wallet addresses.`);
    console.log(`Removed ${duplicateCount} duplicate addresses.`);
    
    // Prompt user for output file name
    rl.question('Enter a name for the output file (without extension): ', async (fileName) => {
      if (!fileName) {
        fileName = 'wallet_addresses';
      }
      
      // Ensure file has .txt extension
      if (!fileName.endsWith('.txt')) {
        fileName += '.txt';
      }
      
      // Split addresses into chunks of 39000 if needed
      const chunkSize = 39000;
      const addressChunks = [];
      
      for (let i = 0; i < allWalletAddresses.length; i += chunkSize) {
        addressChunks.push(allWalletAddresses.slice(i, i + chunkSize));
      }
      
      console.log(`Splitting into ${addressChunks.length} file(s) due to size limit.`);
      
      // Write each chunk to a separate file
      for (let i = 0; i < addressChunks.length; i++) {
        const chunk = addressChunks[i];
        const chunkFileName = addressChunks.length > 1 ? 
          `${fileName.replace('.txt', '')}_${i + 1}.txt` : 
          fileName;
        
        const outputPath = path.join(walletsDir, chunkFileName);
        
        try {
          fs.writeFileSync(outputPath, chunk.join('\n'));
          console.log(`File ${i + 1}: ${chunkFileName} saved with ${chunk.length} addresses.`);
        } catch (error) {
          console.error(`Error writing to file ${chunkFileName}: ${error.message}`);
          rl.close();
          return;
        }
      }
      
      // Remove all CSV files after successful processing
      try {
        for (const csvFile of csvFiles) {
          const csvFilePath = path.join(walletsDir, csvFile);
          fs.unlinkSync(csvFilePath);
        }
        console.log(`Removed ${csvFiles.length} CSV files from the wallets directory.`);
      } catch (error) {
        console.error(`Error removing CSV files: ${error.message}`);
      }
      
      console.log('Processing completed successfully.');
      rl.close();
    });
  } catch (error) {
    console.error(`Error processing tokens: ${error.message}`);
    rl.close();
  }
}

// Extract wallet addresses from a single CSV file
function extractWalletAddresses(filePath) {
  return new Promise((resolve, reject) => {
    const walletAddresses = [];
    
    // First read the file as text to handle special escape sequences
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }
      
      try {
        // Process the CSV file line by line
        const lines = data.split('\n');
        const header = lines[0].split(',');
        const walletAddressIndex = header.findIndex(col => col.trim() === 'wallet_address');
        
        if (walletAddressIndex === -1) {
          return reject(new Error('wallet_address column not found in CSV'));
        }
        
        // Process each line (skipping header)
        for (let i = 1; i < lines.length; i++) {
          try {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse the line manually to handle special characters
            let inQuotes = false;
            let currentField = '';
            let fieldIndex = 0;
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              const nextChar = line[j + 1];
              
              // Handle escape sequences
              if (char === '\\' && nextChar === '"') {
                currentField += '"';
                j++; // Skip the next character (the quote)
              }
              // Start or end of quoted field
              else if (char === '"') {
                if (inQuotes && nextChar === '"') {
                  // Double quotes inside a quoted field = escaped quote
                  currentField += '"';
                  j++; // Skip the next quote
                } else {
                  // Toggle quote state
                  inQuotes = !inQuotes;
                }
              }
              // Field separator
              else if (char === ',' && !inQuotes) {
                if (fieldIndex === walletAddressIndex) {
                  // Remove surrounding quotes if any
                  const cleanAddress = currentField.replace(/^"(.*)"$/, '$1');
                  if (cleanAddress) {
                    walletAddresses.push(cleanAddress);
                  }
                }
                currentField = '';
                fieldIndex++;
              }
              // Normal character
              else {
                currentField += char;
              }
            }
            
            // Handle the last field
            if (fieldIndex === walletAddressIndex) {
              const cleanAddress = currentField.replace(/^"(.*)"$/, '$1');
              if (cleanAddress) {
                walletAddresses.push(cleanAddress);
              }
            }
          } catch (lineError) {
            console.warn(`Warning: Could not process line ${i + 1}: ${lineError.message}`);
          }
        }
        
        resolve(walletAddresses);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

// Execute main function
main();