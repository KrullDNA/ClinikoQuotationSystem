const axios = require('axios');
const config = require('./config');

class ClinikoAPIError extends Error {
  constructor(message, statusCode, retryAfter = null) {
    super(message);
    this.name = 'ClinikoAPIError';
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

class ClinikoAPI {
  constructor() {
    this.client = null;
  }

  _getClient() {
    const apiKey = config.getApiKey();
    const shard = config.getShard();

    if (!apiKey) {
      throw new ClinikoAPIError('API key not configured', 0);
    }

    const baseURL = `https://api.${shard}.cliniko.com/v1/`;
    const auth = Buffer.from(apiKey + ':').toString('base64');

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'FIFQuoteGenerator (info@feetinfocus.com.au)',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    return this.client;
  }

  _handleError(error) {
    if (error.response) {
      const { status, headers } = error.response;
      switch (status) {
        case 401:
          throw new ClinikoAPIError('Invalid API key. Please check your settings.', 401);
        case 404:
          throw new ClinikoAPIError('Resource not found.', 404);
        case 429: {
          const retryAfter = headers['retry-after']
            ? parseInt(headers['retry-after'], 10)
            : 60;
          throw new ClinikoAPIError(
            `Rate limited. Please wait ${retryAfter} seconds.`,
            429,
            retryAfter
          );
        }
        default:
          if (status >= 500) {
            throw new ClinikoAPIError(
              `Cliniko server error (${status}). Please try again later.`,
              status
            );
          }
          throw new ClinikoAPIError(
            `API error: ${status} - ${error.response.statusText}`,
            status
          );
      }
    } else if (error.request) {
      throw new ClinikoAPIError(
        'Network error. Please check your internet connection.',
        0
      );
    } else {
      throw error;
    }
  }

  async _get(url) {
    try {
      const client = this._getClient();
      const response = await client.get(url);
      return response.data;
    } catch (error) {
      if (error instanceof ClinikoAPIError) throw error;
      this._handleError(error);
    }
  }

  async getPatient(referenceNumber) {
    const data = await this._get(
      `patients?q[]=old_reference_id:=${encodeURIComponent(referenceNumber)}`
    );

    if (!data.patients || data.patients.length === 0) {
      return null;
    }

    return data.patients[0];
  }

  async getBillableItems() {
    const data = await this._get('billable_items?per_page=100');
    return data.billable_items || [];
  }

  async getProducts() {
    const allProducts = [];
    let url = 'products?per_page=100';

    while (url) {
      const data = await this._get(url);
      if (data.products) {
        allProducts.push(...data.products);
      }
      url = data.links && data.links.next ? data.links.next : null;
      // If next link is a full URL, extract the path
      if (url && url.startsWith('http')) {
        const urlObj = new URL(url);
        url = urlObj.pathname.replace('/v1/', '') + urlObj.search;
      }
    }

    return allProducts;
  }

  async getBusinesses() {
    const data = await this._get('businesses');
    return data.businesses || [];
  }

  async getTaxes() {
    const data = await this._get('taxes');
    return data.taxes || [];
  }

  async testConnection() {
    try {
      const businesses = await this.getBusinesses();
      return { success: true, businesses };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Connection failed'
      };
    }
  }

  async getPresignedPost() {
    return this._get('patient_attachments/presigned_post');
  }

  async createPatientAttachment(patientId, uploadUrl, description) {
    try {
      const client = this._getClient();
      const response = await client.post('patient_attachments', {
        upload_url: uploadUrl,
        patient_id: patientId,
        description: description
      });
      return response.data;
    } catch (error) {
      if (error instanceof ClinikoAPIError) throw error;
      this._handleError(error);
    }
  }
}

module.exports = { ClinikoAPI, ClinikoAPIError };
