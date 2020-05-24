import sys
import getopt
import math
import numpy as np
import heartpy as hp
from influxdb import InfluxDBClient as influx

if __name__ == '__main__':
    opts, args = getopt.getopt(sys.argv[1:],'hn:', ['help', 'sessionId='])
    print(opts, args)

    if len(args) == 0:
        sys.exit()

    sessionId = args[0]

    client = influx(host='localhost', port=8086)
    data_influx = client.query(
        "SELECT analog from autogen.sensor WHERE sessionId = '" + sessionId + "' ORDER BY DESC LIMIT 10000 OFFSET 0",
        database='vr_data_test'
    )
    points = data_influx.get_points()
    analog_list = []
    time_list = []
    for p in points:
        analog_list.append(p['analog'])
        time_list.append(p['time'])
    analog_list.reverse()
    time_list.reverse()
    data = np.array(analog_list)
    datetime_data = np.array(time_list)

    fs = hp.get_samplerate_datetime(datetime_data, timeformat='%Y-%m-%dT%H:%M:%S.%fZ')

    filtered = hp.enhance_peaks(data, iterations=2)
    filtered = hp.filter_signal(filtered, cutoff=3, sample_rate=fs, order=2)
    try:
        working_data, measures = hp.process(filtered, fs, report_time=True, calc_freq=True)
    except:
        print("error calculating RR")
        sys.exit(0)

#     hp.plotter(working_data, measures)

    filtered_body = []
    for i in range(0, len(filtered)):
        point = {
            "measurement": "sensor_filtered",
            "tags": {
                "sessionId": sessionId,
            },
            "time": time_list[i],
            "fields": {
                "analog": filtered[i]
            }
        }
        filtered_body.append(point)

    client.write_points(filtered_body, database="vr_data_test")

    measure_point = [
        {
            "measurement": "pulse_data",
            "tags": {
                "sessionId": sessionId
            },
            "fields": {
                "bpm": 0 if math.isnan(measures['bpm']) else round(measures['bpm']),
                "rmssd": 0.0 if math.isnan(measures['rmssd']) else measures['rmssd'],
                "sdnn": 0.0 if math.isnan(measures['sdnn']) else measures['sdnn'],
                "ic": 0.0 if math.isnan(measures['lf/hf']) else measures['lf/hf'],
                "breathingrate": 0.0 if math.isnan(measures['breathingrate']) else measures['breathingrate'] * 60
            },
            "time": time_list[len(time_list) - 1]
        }
    ]
    client.write_points(measure_point, database='vr_data_test')
