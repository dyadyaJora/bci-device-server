import sys
import getopt
import numpy as np
import matplotlib.pyplot as plt
from influxdb import InfluxDBClient as influx
import dateutil.parser


if __name__ == '__main__':
    opts, args = getopt.getopt(sys.argv[1:],'hn:', ['help', 'sessionId='])
    print(opts, args)

    # if len(args) == 0:
    #     sys.exit()

    # sessionId = args[0]

    sessionId = "2fe617b1-8b98-4a12-bb0d-083b777d00b7"

    client = influx(host='localhost', port=8086)
    data_influx = client.query(
        "SELECT band7 from autogen.band_power_rel WHERE sessionId = '" + sessionId + "' ORDER BY DESC LIMIT 300 OFFSET 0",
        database='vr_data_test'
    )
    points = data_influx.get_points()
    analog_list = []
    time_list = []
    for p in points:
        analog_list.append(p['band7'])
        yourdate = dateutil.parser.parse(p['time'])
        yourtime = yourdate.timestamp()
        time_list.append(yourtime)
    analog_list.reverse()
    time_list.reverse()
    data = np.array(analog_list)
    datetime_data = np.array(time_list)

    plt.plot(datetime_data, data,'o')

    # calc the trendline
    z = np.polyfit(datetime_data, data, 1)
    p = np.poly1d(z)
    print(p.c[0])
    plt.plot(datetime_data,p(datetime_data),"r--")
    # the line equation:
    # print "y=%.6fx+(%.6f)"%(z[0],z[1])
    plt.show()