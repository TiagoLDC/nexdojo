$password = "@Tmd4738@"
$command = "cd /home/qasnexdojo/nexdojo && git pull origin main && docker compose up -d --build"
echo $password | ssh -p 22022 -o StrictHostKeyChecking=no qasnexdojo@162.240.167.149 $command
