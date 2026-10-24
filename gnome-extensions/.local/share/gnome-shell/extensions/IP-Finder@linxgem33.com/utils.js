import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

Gio._promisify(Soup.Session.prototype, 'send_and_read_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_bytes_async', 'replace_contents_finish');

export const ElementType = {
    VPN_STATUS_ICON: 'VPN_STATUS_ICON',
    IP_ADDRESS: 'IP_ADDRESS',
    COUNTRY_FLAG: 'COUNTRY_FLAG',
    LOCATION: 'LOCATION',
};

export const ElementKey = {
    ALWAYS_SHOW: 'always_show',
    SHOW_CITY: 'show_city',
    SHOW_REGION: 'show_region',
    SHOW_COUNTRY: 'show_country',
    COLORIZE: 'colorize',
    MASK_IP: 'mask_ip',
};

const ApiService = {
    IPINFO_IO: 0,
    IP_API_COM: 1,
    IPAPI_CO: 2,
    IPWHOIS_IO: 3,
};

function normalizeIpData(data) {
    // Normalize data values across different API response formats.
    if (data.connection?.isp)
        data.org = data.connection.isp;
    if (data.timezone?.id)
        data.timezone = data.timezone.id;
    if (data.country_code)
        data.countryCode = data.country_code;
    if (data.query)
        data.ip = data.query;
    if (data.reverse)
        data.hostname = data.reverse;

    // Normalize location format
    let lat, lon;
    if (typeof data.loc === 'string' && data.loc.includes(',')) {
        [lat, lon] = data.loc.split(',');
    } else {
        lat = data.lat ?? data.latitude;
        lon = data.lon ?? data.longitude;
    }
    if (lat != null && lon != null)
        data.loc = `${lat}, ${lon}`;
}

/**
 *
 * @param {Soup.Session} session
 * @param {object} soupParams
 * @param {ApiService} apiService
 * @returns {{data: object | null, error: string | null}} object containing the data of the IP details or error message on fail
 */
export async function getIPDetails(session, soupParams,  apiService) {
    let url;

    const params = soupParams;
    delete params.fields;

    if (apiService === ApiService.IPINFO_IO) {
        url = 'https://ipinfo.io/json';
    } else if (apiService === ApiService.IP_API_COM) {
        // See https://ip-api.com/docs/api:json for 'fields' details.
        // ip-api.com 'free use' API must use http.
        // https API is a paid feature.
        params.fields = '63479';
        url = 'http://ip-api.com/json/';
    } else if (apiService === ApiService.IPAPI_CO) {
        url = 'https://ipapi.co/json/';
    } else if (apiService === ApiService.IPWHOIS_IO) {
        url = 'https://ipwho.is/?output=json';
    }

    const message = Soup.Message.new_from_encoded_form(
        'GET', `${url}`,
        Soup.form_encode_hash(params)
    );

    let data;
    try {
        const bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);

        const decoder = new TextDecoder('utf-8');
        data = JSON.parse(decoder.decode(bytes.get_data()));
        if (message.statusCode === Soup.Status.OK) {
            normalizeIpData(data);
            return {data};
        } else {
            console.log(`Ip Finder: getIpDetails() failed with status code - ${message.statusCode}`);
            const dataError = data['error'] ? `${data['error'].title}. ${data['error'].message}.` : data['message'];
            if (dataError)
                return {error: `${message.statusCode} - ${dataError}.`};
            else
                return {error: `${message.statusCode}`};
        }
    } catch (e) {
        console.log(`Ip Finder: getIpDetails() error - ${e}`);
        return {error: `Ip Finder: getIpDetails() error - ${e}`};
    }
}

/**
 *
 * @param {Array} coordinates
 * @param {int} zoom
 */
export function getMapTileInfo(coordinates, zoom) {
    const [lat, lon] = coordinates.split(', ').map(Number);
    const xTile = Math.floor((lon + 180.0) / 360.0 * (1 << zoom));
    const yTile = Math.floor((1.0 - Math.log(Math.tan(lat * Math.PI / 180.0) + 1.0 / Math.cos(lat * Math.PI / 180.0)) / Math.PI) / 2.0 * (1 << zoom));

    return {zoom, xTile, yTile};
}

/**
 *
 * @param {Soup.Session} session
 * @param {object} soupParams
 * @param {string} extensionPath
 * @param {string} tileInfo
 * @returns {{file: Gio.File | null, error: string | null}} object containing the map tile file or error message on fail
 */
export async function getMapTile(session, soupParams, extensionPath, tileInfo) {
    const file = Gio.file_new_for_path(`${extensionPath}/icons/latest_map.png`);

    const message = Soup.Message.new_from_encoded_form(
        'GET',
        `https://a.tile.openstreetmap.org/${tileInfo}.png`,
        Soup.form_encode_hash(soupParams)
    );

    let data;
    try {
        const bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);

        if (message.statusCode === Soup.Status.OK) {
            data = bytes.get_data();
            const [success, etag_] = await file.replace_contents_bytes_async(data, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            return success ? {file} : {error: 'Error replacing map tile file.'};
        } else {
            console.log(`Ip Finder: getMapTile() failed with status code - ${message.statusCode}`);
            return {error: message.statusCode};
        }
    } catch (e) {
        console.log(`Ip Finder: getMapTile() error - ${e}`);
        return {error: message.statusCode};
    }
}
