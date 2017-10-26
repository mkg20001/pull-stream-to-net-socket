yes | sed "s|y||g" | openssl req -x509 -newkey rsa:4096 -subj '/CN=localhost' -keyout key.pem -out cert.pem -sha256 -nodes -days 3650
