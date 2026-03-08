git add .
date=$(date +"%Y-%m-%d %H:%M:%S")
git commit -m "Update at $date"
git push origin HEAD
