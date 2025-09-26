import formidable from "formidable";

export const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({ 
      keepExtensions: true, 
      multiples: false,
      maxFileSize: 10 * 1024 * 1024 // 10MB limit
    });
    form.on("error", (err) => reject(err));
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

export const config = {
  api: { bodyParser: false },
};
