import math


def load_data(filename):
    data_arr = []
    with open(filename) as f:
        for line in f:
            data_arr.extend([int(val) for val in line.split()])
    return data_arr


def calc_freq(data_arr):
    fi = []
    l = len(data_arr)
    x_max = data_arr[l-1]
    for item in data_arr:
        tmp = item / x_max
        fi.append(tmp)
    return fi


def calc_f(k):
    pass


def calc_power(data_arr):
    N = len(data_arr)
    Pk = []
    for k in range(N):
        Rk = 0
        Ik = 0
        for n in range(N):
            Rk += data_arr[n] * math.cos(-2 * math.pi * (k+1) * (n+1) / N)
            Ik += data_arr[n] * math.sin(-2 * math.pi * (k+1) * (n+1) / N)

        pk = (1 / math.pow(N, 2)) * (Rk*Rk + Ik*Ik)
        Pk.append(pk)

    return Pk


def calc_x_intervals(data_arr):
    x = []
    s_sum = 0
    for item in data_arr:
        s_sum += item
        x.append(s_sum)
    return x


def calc_spectral_components(freq_arr, power_arr):
    res = {"hf": 0, "lf": 0, "vlf": 0}
    i = 0
    while True:
        if freq_arr[i] <= 0.015:
            i += 1
            continue
        if freq_arr[i] <= 0.04:
            res['vlf'] += power_arr[i]
        elif freq_arr[i] <= 0.15:
            res['lf'] += power_arr[i]
        elif freq_arr[i] <= 0.4:
            res['hf'] += power_arr[i]
        else:
            return res
        i += 1


def calc_tp(comps):
    return comp['hf'] + comp['lf'] + comp['vlf']


def calc_spectral_component_percent(components, tp_val):
    percent_comp = {}
    percent_comp['hf'] = 100 * components['hf'] / tp_val
    percent_comp['lf'] = 100 * components['lf'] / tp_val
    percent_comp['vlf'] = 100 * components['vlf'] / tp_val
    return percent_comp


def calc_ic(vlf, lf, hf):
    return (vlf + lf) / hf


def calc_ivv(lf, hf):
    return lf / hf


def calc_isca(lf, vlf):
    return lf / vlf


def print_results(freq_arr, power_arr):
    res_str = ''
    res_str += ','.join(map(lambda x: str(round(x, 3)), freq_arr))
    res_str += ';'
    res_str += ','.join(map(lambda x: str(round(x, 3)), power_arr))
    print(res_str)


if __name__ == '__main__':
    data = load_data('data3')
    # print(data)
    x_n = calc_x_intervals(data)
    f_i = calc_freq(x_n)
    # print(f_i)
    P_i = calc_power(data)
    print(P_i)
    # P_i[0] = 100
    print_results(f_i, P_i)

    comp = calc_spectral_components(f_i, P_i)
    comp['hf'] = round(comp['hf'], 3)
    comp['lf'] = round(comp['lf'], 3)
    comp['vlf'] = round(comp['vlf'], 3)
    print('HF == ', comp['hf'])
    print('LF == ', comp['lf'])
    print('VLF == ', comp['vlf'])
    tp = round(calc_tp(comp), 3)
    print('TP == ', tp)

    per_comp = calc_spectral_component_percent(comp, tp)
    per_comp['hf'] = round(per_comp['hf'], 3)
    per_comp['lf'] = round(per_comp['lf'], 3)
    per_comp['vlf'] = round(per_comp['vlf'], 3)
    print('HF% == ', per_comp['hf'])
    print('LF% == ', per_comp['lf'])
    print('VLF% == ', per_comp['vlf'])

    ic = round(calc_ic(comp['vlf'], comp['lf'], comp['hf']), 3)
    ivv = round(calc_ivv(comp['lf'], comp['hf']), 3)
    isca = round(calc_isca(comp['lf'], comp['vlf']), 3)

    print('IC == ', ic)
    print('IVV == ', ivv)
    print('ISCA == ', isca)