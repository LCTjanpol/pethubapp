import formidable from "formidable";

export const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({ 
      keepExtensions: true, 
      multiples: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      maxFields: 10, // Limit number of fields
      maxFieldsSize: 1024 * 1024 // 1MB for fields
    });
    
    // Set timeout for form parsing
    const timeout = setTimeout(() => {
      reject(new Error('Form parsing timeout'));
    }, 45000); // 45 second timeout
    
    form.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    
    form.parse(req, (err, fields, files) => {
      clearTimeout(timeout);
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });

export const config = {
  api: { bodyParser: false },
};
