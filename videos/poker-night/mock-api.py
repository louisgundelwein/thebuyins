"""Serve fictional USD records for an isolated, unchanged app capture."""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
names = [('alex','Alex',4000,7000),('jamie','Jamie',4000,2500),('sam','Sam',2000,500)]
state = dict(currency='USD',game=dict(id='fictional-friday',groupId='fictional',title='Friday night',status='finished',buyInCents=2000),seats=[dict(id=p,memberId=p,name=n,userId=None,position=i+1,cashOutCents=o) for i,(p,n,b,o) in enumerate(names)],buyIns=[],summary=dict(potCents=10000,cashedOutCents=10000,differenceCents=0,players=[dict(playerId=p,buyInCents=b,cashOutCents=o,netCents=o-b) for p,n,b,o in names]),transfers=[dict(from_='jamie',to='alex',amountCents=1500),dict(from_='sam',to='alex',amountCents=1500)])
for tr in state['transfers']: tr['from']=tr.pop('from_')
class Handler(BaseHTTPRequestHandler):
 def do_OPTIONS(self):
  self.send_response(204); self.headers_(); self.end_headers()
 def headers_(self):
  self.send_header('Access-Control-Allow-Origin','http://127.0.0.1:18764'); self.send_header('Access-Control-Allow-Credentials','true'); self.send_header('Access-Control-Allow-Headers','Content-Type,X-Buyins-Currency'); self.send_header('Content-Type','application/json')
 def do_GET(self):
  path=self.path.split('?')[0]
  if path=='/api/auth/get-session': body=dict(user=dict(id='host',name='Host',email='host@example.test',emailVerified=True,createdAt='2026-11-01T00:00:00Z',updatedAt='2026-11-01T00:00:00Z'),session=dict(id='fictional',token='local-fixture-only',userId='host',expiresAt='2099-01-01T00:00:00Z',createdAt='2026-11-01T00:00:00Z',updatedAt='2026-11-01T00:00:00Z'))
  elif path=='/api/groups': body=[dict(id='fictional',name='Friday friends',currency='USD')]
  elif path=='/api/games/fictional-friday': body=state
  else:
   self.send_response(404); self.headers_(); self.end_headers(); self.wfile.write(json.dumps(dict(error='Unexpected fixture route: '+path)).encode()); return
  self.send_response(200); self.headers_(); self.end_headers(); self.wfile.write(json.dumps(body).encode())
HTTPServer(('127.0.0.1',18765),Handler).serve_forever()
