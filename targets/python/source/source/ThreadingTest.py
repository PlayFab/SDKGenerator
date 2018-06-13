#from queue import Queue
#from threading import Thread
from socket import AF_INET, SOCK_STREAM, socket
from concurrent.futures import ThreadPoolExecutor

def echo_client(sock, client_addr):
    print('got connection from', client_addr)
    while True:
        msg = sock.recv(65536)
        if not msg:
            break
        sock.sendall(msg)
    print('Client closed connection')
    sock.close()

def echo_server(addr):
    pool = ThreadPoolExecutor(128)
    sock = socket(AF_INET, SOCK_STREAM)
    sock.bind(addr)
    sock.listen(5)
    while True:
        client_sock, client_addr = sock.accept()
        pool.submit(echo_client, client_sock, client_addr)

for i in range(0,1000):
    echo_server(('',15000))

#def producer(out_q):
#    while True:
#        # produce data
#        out_q.put("a")

#def consumer(in_q):
#    while True:
#        # Get some data
#        data = in_q.get()
#        # process data
#        if data == "a":
#            return True;



#_sentinel = object()

#def producer(out_q):
#    while running:
#        data = "a"
#        out_q.put(data)
#    out_q.put(_sentinel)

#def consumer(in_q):
#    while True:
#        data = in_q.get()

#        if data is _sentinel:
#            in_q.put(_sentinel)
#            break
    
#q = Queue()
#t1 = Thread(target=consumer, kwargs=(q,))
#t2 = Thread(target=producer, kwargs=(q,))
#t1.start()
#t2.start()
