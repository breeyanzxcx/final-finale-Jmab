document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const addAddressModal = document.getElementById('addAddressModal');
  const confirmationModal = document.getElementById('confirmationModal');
  const addButton = document.querySelector('.add-button');
  const closeButton = document.querySelector('.close-button');
  const addressForm = document.getElementById('addressForm');
  const addressesContainer = document.getElementById('addressesContainer');
  const deleteAddressButton = document.getElementById('deleteAddressButton');
  const confirmDeleteButton = document.getElementById('confirmDeleteButton');
  const cancelDeleteButton = document.getElementById('cancelDeleteButton');

  let currentAddressId = null;

  // Toggle profile dropdown
  window.toggleDropdown = function() {
      const dropdown = document.getElementById('profileDropdown');
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  }

  // Show modal for adding new address
  addButton.addEventListener('click', () => {
      document.getElementById('modalTitle').textContent = 'ADD ADDRESS';
      addressForm.reset();
      document.getElementById('addressId').value = '';
      deleteAddressButton.style.display = 'none';
      addAddressModal.style.display = 'block';
  });

  // Close modal
  closeButton.addEventListener('click', () => {
      addAddressModal.style.display = 'none';
  });

  // Fetch and display addresses
  async function fetchAddresses() {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('authToken');

      try {
          const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          const data = await response.json();
          if (data.success && data.user) {
              displayAddresses(data.user.addresses || []);
          } else {
              console.error('Invalid response format:', data);
              displayAddresses([]);
          }
      } catch (error) {
          console.error('Error fetching addresses:', error);
          displayAddresses([]);
      }
  }

  // Display addresses in the container
  function displayAddresses(addresses) {
      addressesContainer.innerHTML = '';
      if (addresses.length === 0) {
          addressesContainer.innerHTML = '<p>No addresses found.</p>';
          return;
      }

      addresses.forEach(address => {
          const addressElement = document.createElement('div');
          addressElement.className = 'address-item';
          addressElement.innerHTML = `
              <div class="address-details">
                  <p><strong>${address.home_address}</strong></p>
                  <p>${address.barangay}, ${address.city}</p>
                  ${address.is_default === 1 ? '<span class="default-tag">Default</span>' : ''}
              </div>
              <button class="edit-button" data-id="${address.id}">Edit</button>
          `;
          addressesContainer.appendChild(addressElement);

          const editButton = addressElement.querySelector('.edit-button');
          editButton.addEventListener('click', () => editAddress(address.id));
      });
  }

  // Handle form submission (add or update)
  addressForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('authToken');
      const addressId = document.getElementById('addressId').value;
      const isDefault = document.getElementById('setDefault').checked ? 1 : 0;

      let currentAddresses = [];
      try {
          const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          const data = await response.json();
          if (data.success && data.user) {
              currentAddresses = data.user.addresses || [];
          }
      } catch (error) {
          console.error('Error fetching current addresses:', error);
      }

      const addressData = {
          home_address: document.getElementById('street').value,
          barangay: document.getElementById('barangay').value,
          city: document.getElementById('city').value,
          is_default: isDefault
      };

      let updatedAddresses;
      if (addressId) {
          addressData.id = addressId;
          updatedAddresses = currentAddresses.map(addr => {
              if (addr.id == addressId) {
                  return addressData;
              }
              return {
                  ...addr,
                  is_default: isDefault ? 0 : addr.is_default
              };
          });
      } else {
          updatedAddresses = [...currentAddresses];
          if (isDefault) {
              updatedAddresses = updatedAddresses.map(addr => ({
                  ...addr,
                  is_default: 0
              }));
          }
          updatedAddresses.push(addressData);
      }

      const payload = {
          addresses: updatedAddresses
      };

      try {
          console.log('Sending update payload:', JSON.stringify(payload, null, 2));
          const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
              method: 'PUT',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
          });

          if (response.ok) {
              addAddressModal.style.display = 'none';
              await fetchAddresses();
              console.log('Address updated successfully');
          } else {
              const errorText = await response.text();
              console.error('Failed to update address:', errorText);
              alert('Failed to update address: ' + errorText);
          }
      } catch (error) {
          console.error('Error updating address:', error);
          alert('Error updating address: ' + error.message);
      }
  });

  // Edit specific address
  async function editAddress(addressId) {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('authToken');

      try {
          const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          const data = await response.json();

          if (data.success && data.user) {
              const address = data.user.addresses.find(addr => addr.id == addressId);
              if (address) {
                  document.getElementById('modalTitle').textContent = `EDIT ADDRESS (ID: ${addressId})`;
                  document.getElementById('street').value = address.home_address || '';
                  document.getElementById('barangay').value = address.barangay || '';
                  document.getElementById('city').value = address.city || '';
                  document.getElementById('setDefault').checked = address.is_default === 1;
                  document.getElementById('addressId').value = address.id;
                  deleteAddressButton.style.display = 'block';
                  currentAddressId = address.id;
                  addAddressModal.style.display = 'block';
              } else {
                  console.error(`Address with ID ${addressId} not found`);
                  alert(`Address with ID ${addressId} not found`);
              }
          } else {
              console.error('Invalid response format:', data);
              alert('Failed to load address data');
          }
      } catch (error) {
          console.error('Error fetching address for edit:', error);
          alert('Error loading address: ' + error.message);
      }
  }

  // Delete specific address
  async function deleteAddress(addressId) {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('authToken');

      const payload = {
          address_ids: [addressId] // Only the selected address ID
      };

      console.log('Attempting to delete address with ID:', addressId);
      console.log('Delete payload:', JSON.stringify(payload, null, 2));

      try {
          const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}/addresses`, {
              method: 'DELETE',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
          });

          const responseText = await response.text();
          console.log('Delete response status:', response.status);
          console.log('Delete response body:', responseText);

          if (response.ok) {
              console.log(`Address ${addressId} deleted successfully`);
              confirmationModal.style.display = 'none';
              addAddressModal.style.display = 'none';
              await fetchAddresses();
          } else {
              console.error('Failed to delete address:', responseText);
              alert('Failed to delete address: ' + responseText);
          }
      } catch (error) {
          console.error('Error deleting address:', error);
          alert('Error deleting address: ' + error.message);
      }
  }

  // Delete address button click
  deleteAddressButton.addEventListener('click', () => {
      confirmationModal.style.display = 'block';
  });

  // Confirm delete
  confirmDeleteButton.addEventListener('click', () => {
      if (currentAddressId) {
          deleteAddress(currentAddressId);
      } else {
          console.error('No address ID selected for deletion');
          alert('No address selected to delete');
      }
  });

  // Cancel delete
  cancelDeleteButton.addEventListener('click', () => {
      confirmationModal.style.display = 'none';
  });

  // Initial fetch of addresses
  fetchAddresses();
});